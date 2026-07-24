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
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[2]
FRONTEND = ROOT / "frontend"
SOURCE_DIR = ROOT / "product photos" / "2026.7.23 原来产品重拍"
ATTACHMENT_DIR = Path(
    r"C:\Users\alexd\.codex\codex-remote-attachments\019ebedf-3fe6-76b3-8da4-f17b82940401\E706A35F-6908-4BEC-AEA5-9F626DFCAD54"
)
OUT_DIR = ROOT / "deliverables"
REPORT_HTML = OUT_DIR / "2026-07-23-gallery-import-report.html"
REPORT_CSV = OUT_DIR / "2026-07-23-gallery-import-status.csv"
OPTIMIZED_DIR = ROOT / "outputs" / "2026-07-23-gallery-import" / "optimized"
BUCKET = "product-images"
ORIGINAL_DOUBLE_TIGER_HERO = (
    "https://pgbjgueicmpakgaaisdg.supabase.co/storage/v1/object/public/"
    "product-images/double-tailed-tiger-mini-stapler/cover.webp"
)


@dataclass(frozen=True)
class Assignment:
    slug: str
    name: str
    source_keys: tuple[str, ...]
    hero_key: str
    confidence: float
    notes: str


ASSIGNMENTS: list[Assignment] = [
    Assignment("phoenix-pattern-glass-cup", "Tengwang Pavilion Cup / Package", ("285", "286", "287"), "287", 0.74, "Visible Tengwang Pavilion packaging; existing product is the closest catalog match."),
    Assignment("turquoise-animal-3d-eraser", "Turquoise / jade animal 3D eraser", ("288", "289", "290", "293", "294", "297"), "293", 0.78, "Packaging and object views show animal 3D eraser family."),
    Assignment("fu-hao-owl-zun-coin-bank", "Shi Fa You / pink bronze package", ("291", "292", "295", "296"), "295", 0.82, "Existing LTPS row maps this pink package to the current slug."),
    Assignment("fu-hao-owl-zun-fridge-magnet", "Bo Ju Li bronze gift", ("298", "299", "300", "301"), "298", 0.82, "Brown Bo Ju Li package; existing database slug is legacy named."),
    Assignment("heritage-motif-gift-box", "Hulu vase translucent gift", ("302", "303", "304", "308"), "303", 0.80, "Hulu vase package; existing LTPS row maps to this slug."),
    Assignment("sun-wukong-figurine", "Sun Wukong Figurine", ("305", "306", "307", "310", "311", "312"), "305", 0.98, "Clear unpackaged Sun Wukong hero plus box and packaging views."),
    Assignment("double-tailed-tiger-mini-stapler", "Double-Tailed Tiger Mini Stapler", ("313", "314", "315", "316", "317"), "317", 0.94, "New package/gallery photos only. Product hero is locked to original cover.webp."),
    Assignment("jade-cong-fridge-magnet", "Jade Cong Refrigerator Magnet", ("321", "322", "323", "324", "325", "326", "327"), "326", 0.94, "Visible Jade Cong package and object views."),
    Assignment("chinese-mask-paper-art-set", "Chinese Mask Paper Art Set", ("328", "331", "332"), "331", 0.82, "Mask-shaped paper/art item matches existing catalog slug."),
    Assignment("heritage-plush-keychains", "Boletus Plush Keychain", ("329", "330", "333", "A01", "A02", "A03"), "A03", 0.90, "Boletus plush pendant views from local and uploaded sources."),
    Assignment("heritage-character-pencil-set", "Heritage Character Pencil Set", ("334", "335", "336", "338", "339", "340"), "334", 0.78, "Three colorful character pencil views."),
    Assignment("houmuwu-ding-3d-eraser", "Houmuwu Ding 3D Eraser", ("337", "341", "342", "343", "344"), "343", 0.96, "Houmuwu Ding package and object views."),
    Assignment("fu-hao-owl-zun-stamp-gift", "Deer-Head Gold Step-Shake Ornament", ("345", "346", "347", "348", "349"), "347", 0.86, "Current database slug is legacy; product text identifies deer-head gold step-shake ornament."),
    Assignment("tiger-motif-long-gift-box", "Bronze crouching bird double-tailed tiger eraser", ("350", "351", "352"), "352", 0.82, "Long orange package with bronze crouching bird / double-tailed tiger text."),
    Assignment("gold-crown-ornament", "Gold Crown Ornament", ("353", "354", "355", "357", "358"), "354", 0.93, "Gold crown package and object views."),
    Assignment("oracle-bone-script-discovery-gift", "Wanghou seal eraser gift", ("359", "360", "363", "364"), "363", 0.76, "Seal/printing themed package; existing slug is closest legacy catalog entry."),
    Assignment("tang-style-round-ornament", "Round gold relief ornament", ("361", "362", "365", "366"), "365", 0.80, "Purple package and round relief object match current ornament entry."),
    Assignment("drumming-storyteller-3d-eraser", "Drumming Storyteller 3D Eraser", ("367", "368", "369", "370"), "370", 0.97, "Visible drumming storyteller package text."),
    Assignment("heritage-motif-pouch", "Haihunhou Heritage Pouch", ("A04", "A05", "A06"), "A06", 0.92, "Uploaded pouch photos with Haihunhou text."),
    Assignment("sanxingdui-figure-3d-eraser", "Tri-colored glazed camel 3D eraser", ("A07", "A08", "A09"), "A09", 0.88, "Uploaded package text identifies tri-colored glazed camel 3D eraser."),
    Assignment("fu-hao-owl-zun-pendant", "Bronze Yue Key Chain", ("A10",), "A10", 0.86, "Uploaded package text identifies Bronze yue key chain; existing legacy slug maps copper yue keychain."),
]

UNMATCHED = {
    "318": "Pig novelty pen has no reliable existing product slug.",
    "319": "Pig novelty pen has no reliable existing product slug.",
    "320": "Pig novelty pen has no reliable existing product slug.",
}


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
    required = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
    missing = [key for key in required if not env.get(key)]
    if missing:
        raise SystemExit(f"Missing required env vars: {', '.join(missing)}")
    return env


def natural_key(path: Path) -> list[object]:
    return [int(part) if part.isdigit() else part.lower() for part in re.split(r"(\d+)", path.name)]


def source_number(path: Path) -> str:
    match = re.search(r"_(\d+)_109$", path.stem)
    if not match:
        raise ValueError(f"Cannot parse source number from {path.name}")
    return match.group(1)


def attachment_key(path: Path) -> str:
    return f"A{int(path.name.split('-', 1)[0]):02d}"


def load_sources() -> dict[str, Path]:
    local = sorted([p for p in SOURCE_DIR.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}], key=natural_key)
    attachments = sorted([p for p in ATTACHMENT_DIR.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}], key=lambda p: int(p.name.split("-", 1)[0]))
    if len(local) != 86:
        raise SystemExit(f"Expected 86 local photos, found {len(local)}")
    if len(attachments) != 10:
        raise SystemExit(f"Expected 10 uploaded photos, found {len(attachments)}")
    result = {source_number(path): path for path in local}
    result.update({attachment_key(path): path for path in attachments})
    return result


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
        with urllib.request.urlopen(req, timeout=60) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else []
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {path} failed: {exc.code} {detail}") from exc


def fetch_products(env: dict[str, str]) -> dict[str, dict]:
    rows = request_json(env, "GET", "/rest/v1/products?select=slug,images,cover_image,gallery_images,packaging_images,lifestyle_images,product_name_en,product_name_zh,english_name,name")
    return {row["slug"]: row for row in rows}


def optimize_image(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    image = ImageOps.exif_transpose(Image.open(source)).convert("RGB")
    image.thumbnail((1800, 1800), Image.Resampling.LANCZOS)
    image.save(destination, "WEBP", quality=88, method=5)


def upload_file(env: dict[str, str], local_path: Path, object_path: str) -> str:
    data = local_path.read_bytes()
    quoted = "/".join(urllib.parse.quote(part) for part in object_path.split("/"))
    req = urllib.request.Request(
        f"{env['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/')}/storage/v1/object/{BUCKET}/{quoted}",
        data=data,
        method="POST",
        headers={
            "apikey": env["SUPABASE_SERVICE_ROLE_KEY"],
            "Authorization": f"Bearer {env['SUPABASE_SERVICE_ROLE_KEY']}",
            "Content-Type": mimetypes.guess_type(local_path.name)[0] or "application/octet-stream",
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


def role_for(index: int, key: str, hero_key: str) -> str:
    if key == hero_key:
        return "hero"
    if index <= 2:
        return f"gallery-{index:02d}"
    return f"gallery-{index:02d}"


def dedupe(urls: list[str]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for url in urls:
        if not url or url in seen:
            continue
        seen.add(url)
        result.append(url)
    return result


def build_html(rows: list[dict], summary: dict) -> str:
    grouped: dict[str, list[dict]] = {}
    for row in rows:
        grouped.setdefault(row["product_slug"], []).append(row)
    cards = []
    for slug, items in grouped.items():
        previews = "".join(
            f'<figure><img src="{html.escape(item["local_preview"])}" alt=""><figcaption>{html.escape(item["source_filename"])}<br>{html.escape(item["assigned_role"])}</figcaption></figure>'
            for item in items
            if item.get("local_preview")
        )
        notes = html.escape(items[0].get("notes", ""))
        cards.append(
            f"<article><header><div><p>{html.escape(slug)}</p><h2>{html.escape(items[0]['detected_product_name'])}</h2></div><strong>{len(items)} images</strong></header><div class=\"grid\">{previews}</div><p>{notes}</p></article>"
        )
    unmatched = "".join(
        f"<tr><td>{html.escape(row['source_filename'])}</td><td>{html.escape(row['notes'])}</td></tr>"
        for row in rows
        if row["status"] == "NEEDS_REVIEW"
    )
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>2026-07-23 Gallery Import</title><style>
body{{margin:0;background:#f5f2ec;color:#171717;font:15px/1.5 Arial,sans-serif}}main{{max-width:1320px;margin:auto;padding:44px 22px}}h1{{font:42px/1.05 Georgia,serif;margin:0 0 10px}}.lede{{color:#666}}article{{background:#fff;border:1px solid #ddd7cc;margin:22px 0;padding:22px}}header{{display:flex;justify-content:space-between;gap:20px;align-items:start}}header p{{margin:0;color:#777}}h2{{font-size:26px;margin:3px 0 14px}}.grid{{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}}figure{{margin:0}}img{{width:100%;aspect-ratio:4/5;object-fit:contain;background:#fff;border:1px solid #eee}}figcaption{{font-size:11px;color:#555;overflow-wrap:anywhere}}table{{width:100%;border-collapse:collapse;background:#fff}}td,th{{border:1px solid #ddd7cc;padding:8px;text-align:left}}@media(max-width:900px){{.grid{{grid-template-columns:repeat(2,1fr)}}h1{{font-size:32px}}}}</style></head><body><main>
<h1>2026-07-23 Gallery Import</h1><p class="lede">Read {summary['source_total']} photos. Published {summary['published']} photos across {summary['product_total']} products. Needs review: {summary['needs_review']}.</p>
{''.join(cards)}
<h2>Needs Review</h2><table><tr><th>Source</th><th>Reason</th></tr>{unmatched}</table>
</main></body></html>"""


def main() -> None:
    env = load_env()
    sources = load_sources()
    products = fetch_products(env)
    missing_slugs = [assignment.slug for assignment in ASSIGNMENTS if assignment.slug not in products]
    if missing_slugs:
        raise SystemExit(f"Assignments reference missing product slugs: {', '.join(missing_slugs)}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OPTIMIZED_DIR.mkdir(parents=True, exist_ok=True)
    rows: list[dict] = []
    product_updates: dict[str, list[str]] = {}
    upload_start = time.time()

    for assignment in ASSIGNMENTS:
        urls: list[str] = []
        for index, key in enumerate(assignment.source_keys, start=1):
            source = sources[key]
            role = role_for(index, key, assignment.hero_key)
            object_name = f"{assignment.slug}-20260723-{role}.webp"
            optimized = OPTIMIZED_DIR / assignment.slug / object_name
            optimize_image(source, optimized)
            object_path = f"{assignment.slug}/20260723/{object_name}"
            public_url = upload_file(env, optimized, object_path)
            urls.append(public_url)
            local_preview = optimized.relative_to(ROOT).as_posix()
            rows.append(
                {
                    "source_filename": source.name,
                    "detected_product_name": assignment.name,
                    "product_slug": assignment.slug,
                    "assigned_role": role,
                    "match_confidence": f"{assignment.confidence:.2f}",
                    "uploaded_url": public_url,
                    "published": "true",
                    "status": "PUBLISHED",
                    "notes": assignment.notes,
                    "local_preview": local_preview,
                }
            )
        product_updates[assignment.slug] = urls

    for key, reason in UNMATCHED.items():
        source = sources[key]
        rows.append(
            {
                "source_filename": source.name,
                "detected_product_name": "Unmatched pig novelty pen",
                "product_slug": "UNMATCHED",
                "assigned_role": "needs-review",
                "match_confidence": "0.30",
                "uploaded_url": "",
                "published": "false",
                "status": "NEEDS_REVIEW",
                "notes": reason,
                "local_preview": "",
            }
        )

    for assignment in ASSIGNMENTS:
        current = products[assignment.slug]
        existing_images = current.get("images") or []
        existing_gallery = current.get("gallery_images") or []
        existing_packaging = current.get("packaging_images") or []
        existing_lifestyle = current.get("lifestyle_images") or []
        existing_all = dedupe(existing_images + existing_gallery + existing_packaging + existing_lifestyle)
        retained_old = [url for url in existing_all if "retouched-2026-07-24" not in url and "/20260723/" not in url]
        new_urls = product_updates[assignment.slug]

        if assignment.slug == "double-tailed-tiger-mini-stapler":
            cover = ORIGINAL_DOUBLE_TIGER_HERO
            gallery = dedupe(new_urls + [url for url in retained_old if url != cover])
            images = dedupe([cover] + gallery)
        else:
            hero_url = next((row["uploaded_url"] for row in rows if row["product_slug"] == assignment.slug and row["assigned_role"] == "hero"), new_urls[0])
            cover = hero_url
            gallery = dedupe([url for url in new_urls if url != cover] + retained_old)
            images = dedupe([cover] + gallery)

        payload = {
            "cover_image": cover,
            "images": images,
            "gallery_images": gallery,
            "photo_checked": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        encoded_slug = urllib.parse.quote(assignment.slug, safe="")
        request_json(env, "PATCH", f"/rest/v1/products?slug=eq.{encoded_slug}", payload)
        removed = [url for url in existing_all if url not in images and "retouched-2026-07-24" in url]
        for row in rows:
            if row["product_slug"] == assignment.slug:
                row["final_image_count"] = str(len(images))
                row["removed_old_images"] = " | ".join(removed)
                row["retained_old_images"] = str(len([url for url in retained_old if url in images]))
                row["final_hero_url"] = cover

    for row in rows:
        row.setdefault("final_image_count", "")
        row.setdefault("removed_old_images", "")
        row.setdefault("retained_old_images", "")
        row.setdefault("final_hero_url", "")

    csv_fields = [
        "source_filename",
        "detected_product_name",
        "product_slug",
        "assigned_role",
        "match_confidence",
        "uploaded_url",
        "published",
        "status",
        "notes",
        "final_image_count",
        "final_hero_url",
        "removed_old_images",
        "retained_old_images",
    ]
    with REPORT_CSV.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=csv_fields)
        writer.writeheader()
        writer.writerows([{key: row.get(key, "") for key in csv_fields} for row in rows])

    summary = {
        "source_total": len(sources),
        "published": sum(1 for row in rows if row["published"] == "true"),
        "needs_review": sum(1 for row in rows if row["status"] == "NEEDS_REVIEW"),
        "product_total": len(ASSIGNMENTS),
        "duration_seconds": round(time.time() - upload_start, 1),
        "double_tiger_hero": ORIGINAL_DOUBLE_TIGER_HERO,
    }
    REPORT_HTML.write_text(build_html(rows, summary), encoding="utf-8")
    (OUT_DIR / "2026-07-23-gallery-import-summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
