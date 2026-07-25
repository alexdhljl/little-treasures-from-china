from __future__ import annotations

import csv
import html
import json
import mimetypes
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
from rembg import new_session, remove


ROOT = Path(__file__).resolve().parents[2]
FRONTEND = ROOT / "frontend"
SOURCE_DIR = ROOT / "product photos" / "2026.7.23 原来产品重拍"
FALLBACK_SOURCE_DIR = ROOT / "product photos" / "2026.7.23 鍘熸潵浜у搧閲嶆媿"
ATTACHMENT_DIR = Path(
    r"C:\Users\alexd\.codex\codex-remote-attachments\019ebedf-3fe6-76b3-8da4-f17b82940401\E706A35F-6908-4BEC-AEA5-9F626DFCAD54"
)
IMPORT_CSV = ROOT / "deliverables" / "2026-07-23-gallery-import-status.csv"
OUT_DIR = ROOT / "outputs" / "2026-07-24-ai-retouch-gallery"
RETOUCHED_DIR = OUT_DIR / "retouched"
DELIVERABLES = ROOT / "deliverables"
REPORT_HTML = DELIVERABLES / "2026-07-24-ai-retouch-gallery-report.html"
REPORT_CSV = DELIVERABLES / "2026-07-24-ai-retouch-gallery-status.csv"
REPORT_SUMMARY = DELIVERABLES / "2026-07-24-ai-retouch-gallery-summary.json"
BUCKET = "product-images"
VERSION = "ai-retouched-2026-07-24"
ORIGINAL_DOUBLE_TIGER_HERO = (
    "https://pgbjgueicmpakgaaisdg.supabase.co/storage/v1/object/public/"
    "product-images/double-tailed-tiger-mini-stapler/cover.webp"
)


@dataclass
class RetouchedRow:
    source_filename: str
    product_slug: str
    detected_product_name: str
    assigned_role: str
    raw_uploaded_url: str
    retouched_uploaded_url: str
    retouch_status: str
    quality_notes: str
    published: str
    needs_review: str
    local_preview: str


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    path = FRONTEND / ".env.local"
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            env[key.strip()] = value.strip().strip('"').strip("'")
    env.update({key: value for key, value in os.environ.items() if key.startswith("SUPABASE") or key.startswith("NEXT_PUBLIC_SUPABASE")})
    missing = [key for key in ("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY") if not env.get(key)]
    if missing:
        raise SystemExit(f"Missing env vars: {', '.join(missing)}")
    return env


def request_json(env: dict[str, str], method: str, path: str, payload: object | None = None):
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(
        env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/") + path,
        data=body,
        method=method,
        headers={
            "apikey": env["SUPABASE_SERVICE_ROLE_KEY"],
            "Authorization": f"Bearer {env['SUPABASE_SERVICE_ROLE_KEY']}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else []
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {path} failed: {exc.code} {detail}") from exc


def upload_file(env: dict[str, str], local_path: Path, object_path: str) -> str:
    quoted = "/".join(urllib.parse.quote(part) for part in object_path.split("/"))
    req = urllib.request.Request(
        f"{env['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/')}/storage/v1/object/{BUCKET}/{quoted}",
        data=local_path.read_bytes(),
        method="POST",
        headers={
            "apikey": env["SUPABASE_SERVICE_ROLE_KEY"],
            "Authorization": f"Bearer {env['SUPABASE_SERVICE_ROLE_KEY']}",
            "Content-Type": mimetypes.guess_type(local_path.name)[0] or "image/webp",
            "x-upsert": "true",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            response.read()
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Upload failed for {object_path}: {exc.code} {detail}") from exc
    return f"{env['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/')}/storage/v1/object/public/{BUCKET}/{quoted}"


def read_import_rows() -> list[dict[str, str]]:
    rows = []
    with IMPORT_CSV.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            if row.get("status") == "PUBLISHED" and row.get("published") == "true":
                rows.append(row)
    return rows


def source_path(filename: str) -> Path:
    for folder in (SOURCE_DIR, FALLBACK_SOURCE_DIR, ATTACHMENT_DIR):
        candidate = folder / filename
        if candidate.exists():
            return candidate
    raise FileNotFoundError(filename)


def safe_part(value: str) -> str:
    value = value.lower().replace("hero", "hero")
    return re.sub(r"[^a-z0-9]+", "-", value).strip("-") or "gallery"


def alpha_bbox(alpha: Image.Image) -> tuple[int, int, int, int] | None:
    mask = np.asarray(alpha, dtype=np.uint8)
    ys, xs = np.where(mask > 12)
    if len(xs) == 0:
        return None
    return int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)


def soft_shadow(alpha: Image.Image, size: tuple[int, int]) -> Image.Image:
    shadow = Image.new("RGBA", size, (0, 0, 0, 0))
    blurred = alpha.filter(ImageFilter.GaussianBlur(18))
    shadow.putalpha(blurred.point(lambda p: int(p * 0.16)))
    return shadow


def retouch_image(source: Path, output: Path) -> tuple[str, bool]:
    image = ImageOps.exif_transpose(Image.open(source)).convert("RGB")
    image.thumbnail((1800, 1800), Image.Resampling.LANCZOS)
    image = ImageEnhance.Brightness(image).enhance(1.13)
    image = ImageEnhance.Contrast(image).enhance(1.06)
    image = ImageEnhance.Color(image).enhance(1.10)
    cutout = remove(image, session=SESSION, alpha_matting=False)
    rgba = cutout.convert("RGBA")
    bbox = alpha_bbox(rgba.getchannel("A"))
    notes: list[str] = []
    needs_review = False
    if bbox:
        left, top, right, bottom = bbox
        width, height = right - left, bottom - top
        pad_x = max(28, int(width * 0.08))
        pad_y = max(28, int(height * 0.08))
        rgba = rgba.crop((max(0, left - pad_x), max(0, top - pad_y), min(rgba.width, right + pad_x), min(rgba.height, bottom + pad_y)))
    else:
        notes.append("AI mask failed; used enhanced source on white canvas.")
        needs_review = True
        rgba = image.convert("RGBA")

    canvas_w, canvas_h = 1600, 2000
    max_w, max_h = int(canvas_w * 0.82), int(canvas_h * 0.82)
    rgba.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (canvas_w, canvas_h), (255, 255, 255, 255))
    x = (canvas_w - rgba.width) // 2
    y = (canvas_h - rgba.height) // 2
    shadow = soft_shadow(rgba.getchannel("A"), rgba.size)
    canvas.alpha_composite(shadow, (x + 8, y + 18))
    canvas.alpha_composite(rgba, (x, y))
    final = canvas.convert("RGB").filter(ImageFilter.UnsharpMask(radius=1.0, percent=55, threshold=4))
    output.parent.mkdir(parents=True, exist_ok=True)
    final.save(output, "WEBP", quality=92, method=5)

    coverage = (rgba.width * rgba.height) / (canvas_w * canvas_h)
    if coverage < 0.08:
        notes.append("low product coverage")
        needs_review = True
    if coverage > 0.78:
        notes.append("high product coverage")
        needs_review = True
    if not notes:
        notes.append("AI cutout, white background, soft shadow, product retained.")
    return "; ".join(notes), needs_review


def fetch_products(env: dict[str, str]) -> dict[str, dict]:
    rows = request_json(env, "GET", "/rest/v1/products?select=slug,images,cover_image,gallery_images,packaging_images,lifestyle_images")
    return {row["slug"]: row for row in rows}


def dedupe(urls: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for url in urls:
        if url and url not in seen:
            seen.add(url)
            result.append(url)
    return result


def build_report(rows: list[RetouchedRow], summary: dict) -> str:
    grouped: dict[str, list[RetouchedRow]] = defaultdict(list)
    for row in rows:
        grouped[row.product_slug].append(row)
    cards = []
    for slug, items in sorted(grouped.items()):
        images = "".join(
            f'<figure><img src="{html.escape(item.local_preview)}" alt=""><figcaption>{html.escape(item.source_filename)}<br>{html.escape(item.assigned_role)}<br>{html.escape(item.retouch_status)}</figcaption></figure>'
            for item in items
            if item.local_preview
        )
        cards.append(f"<article><header><div><p>{html.escape(slug)}</p><h2>{html.escape(items[0].detected_product_name)}</h2></div><strong>{len(items)}</strong></header><div class='grid'>{images}</div></article>")
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>2026-07-24 AI Retouch Gallery</title><style>
body{{margin:0;background:#f5f2ec;color:#171717;font:15px/1.5 Arial,sans-serif}}main{{max-width:1320px;margin:auto;padding:44px 22px}}h1{{font:42px/1.05 Georgia,serif;margin:0 0 10px}}.lede{{color:#666}}article{{background:#fff;border:1px solid #ddd7cc;margin:22px 0;padding:22px}}header{{display:flex;justify-content:space-between;gap:20px;align-items:start}}header p{{margin:0;color:#777}}h2{{font-size:24px;margin:3px 0 14px}}.grid{{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}}figure{{margin:0}}img{{width:100%;aspect-ratio:4/5;object-fit:contain;background:#fff;border:1px solid #eee}}figcaption{{font-size:11px;color:#555;overflow-wrap:anywhere}}@media(max-width:900px){{.grid{{grid-template-columns:repeat(2,1fr)}}h1{{font-size:32px}}}}</style></head><body><main>
<h1>2026-07-24 AI Retouch Gallery</h1><p class="lede">Processed {summary['processed']} images. Published {summary['published']} images. Needs retouch review: {summary['needs_review']}.</p>{''.join(cards)}</main></body></html>"""


def main() -> None:
    env = load_env()
    rows = read_import_rows()
    if len(rows) != 91:
        raise SystemExit(f"Expected 91 published rows, found {len(rows)}")
    products = fetch_products(env)
    output_rows: list[RetouchedRow] = []
    product_urls: dict[str, list[str]] = defaultdict(list)
    start = time.time()

    for index, row in enumerate(rows, start=1):
        slug = row["product_slug"]
        source = source_path(row["source_filename"])
        role = safe_part(row["assigned_role"])
        role = "hero" if role == "hero" else role
        filename = f"{slug}-{VERSION}-{index:03d}-{role}.webp"
        local_output = RETOUCHED_DIR / slug / filename
        preexisting_output = local_output.exists()
        notes, needs_review = retouch_image(source, local_output)
        object_path = f"{slug}/{VERSION}/{filename}"
        quoted = "/".join(urllib.parse.quote(part) for part in object_path.split("/"))
        public_url = f"{env['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/')}/storage/v1/object/public/{BUCKET}/{quoted}"
        if not preexisting_output:
            public_url = upload_file(env, local_output, object_path)
        product_urls[slug].append(public_url)
        output_rows.append(
            RetouchedRow(
                source_filename=row["source_filename"],
                product_slug=slug,
                detected_product_name=row["detected_product_name"],
                assigned_role=row["assigned_role"],
                raw_uploaded_url=row["uploaded_url"],
                retouched_uploaded_url=public_url,
                retouch_status="NEEDS_RETOUCH_REVIEW" if needs_review else "AI_RETOUCHED",
                quality_notes=notes,
                published="true",
                needs_review="true" if needs_review else "false",
                local_preview=local_output.relative_to(ROOT).as_posix(),
            )
        )
        print(f"[{index}/{len(rows)}] {slug} {row['source_filename']} -> {public_url}")

    for slug, urls in product_urls.items():
        current = products.get(slug)
        if not current:
            raise RuntimeError(f"Missing product slug in database: {slug}")
        existing_all = dedupe(
            (current.get("images") or [])
            + (current.get("gallery_images") or [])
            + (current.get("packaging_images") or [])
            + (current.get("lifestyle_images") or [])
        )
        retained_old = [
            url
            for url in existing_all
            if "/20260723/" not in url and VERSION not in url and "retouched-2026-07-24" not in url
        ]
        if slug == "double-tailed-tiger-mini-stapler":
            cover = ORIGINAL_DOUBLE_TIGER_HERO
            gallery = dedupe(urls + [url for url in retained_old if url != cover])
            images = dedupe([cover] + gallery)
        else:
            hero = next((item.retouched_uploaded_url for item in output_rows if item.product_slug == slug and item.assigned_role == "hero"), urls[0])
            cover = hero
            gallery = dedupe([url for url in urls if url != hero] + retained_old)
            images = dedupe([cover] + gallery)
        encoded_slug = urllib.parse.quote(slug, safe="")
        request_json(
            env,
            "PATCH",
            f"/rest/v1/products?slug=eq.{encoded_slug}",
            {
                "cover_image": cover,
                "images": images,
                "gallery_images": gallery,
                "photo_checked": True,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
        )

    DELIVERABLES.mkdir(parents=True, exist_ok=True)
    with REPORT_CSV.open("w", newline="", encoding="utf-8-sig") as handle:
        fields = [
            "source_filename",
            "product_slug",
            "detected_product_name",
            "assigned_role",
            "raw_uploaded_url",
            "retouched_uploaded_url",
            "retouch_status",
            "quality_notes",
            "published",
            "needs_review",
        ]
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows([{field: getattr(row, field) for field in fields} for row in output_rows])

    summary = {
        "processed": len(output_rows),
        "published": sum(1 for row in output_rows if row.published == "true"),
        "needs_review": sum(1 for row in output_rows if row.needs_review == "true"),
        "products": len(product_urls),
        "duration_seconds": round(time.time() - start, 1),
        "double_tiger_hero": ORIGINAL_DOUBLE_TIGER_HERO,
        "version": VERSION,
    }
    REPORT_SUMMARY.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    REPORT_HTML.write_text(build_report(output_rows, summary), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    SESSION = new_session("u2net")
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
