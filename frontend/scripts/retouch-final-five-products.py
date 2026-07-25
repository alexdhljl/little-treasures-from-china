from __future__ import annotations

import json
import mimetypes
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
from rembg import new_session, remove


ROOT = Path(__file__).resolve().parents[2]
FRONTEND = ROOT / "frontend"
OUT = ROOT / "outputs" / "final-five-product-retouch"
BACKUP = ROOT / "backup" / "final-five-product-retouch"
VERSION = "final-five-retouched-2026-07-25"
BUCKET = "product-images"
SLUGS = (
    "promotion-board-game-gift",
    "four-musicians-translucent-bookmark",
    "figure-motif-long-gift",
    "yinxu-cultural-life-gift",
    "fu-hao-owl-zun-gift-box",
)


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for line in (FRONTEND / ".env.local").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            env[key] = value.strip().strip("'\"")
    env.update(os.environ)
    return env


def api(env: dict[str, str], method: str, path: str, payload: object | None = None):
    request = urllib.request.Request(
        env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/") + path,
        data=json.dumps(payload).encode() if payload is not None else None,
        method=method,
        headers={
            "apikey": env["SUPABASE_SERVICE_ROLE_KEY"],
            "Authorization": f"Bearer {env['SUPABASE_SERVICE_ROLE_KEY']}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        raw = response.read().decode()
        return json.loads(raw) if raw else []


def upload(env: dict[str, str], local: Path, object_path: str) -> str:
    quoted = "/".join(urllib.parse.quote(part) for part in object_path.split("/"))
    request = urllib.request.Request(
        f"{env['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/')}/storage/v1/object/{BUCKET}/{quoted}",
        data=local.read_bytes(),
        method="POST",
        headers={
            "apikey": env["SUPABASE_SERVICE_ROLE_KEY"],
            "Authorization": f"Bearer {env['SUPABASE_SERVICE_ROLE_KEY']}",
            "Content-Type": mimetypes.guess_type(local.name)[0] or "image/webp",
            "x-upsert": "true",
        },
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        response.read()
    return f"{env['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/')}/storage/v1/object/public/{BUCKET}/{quoted}"


def dedupe(values: list[str]) -> list[str]:
    return list(dict.fromkeys(value for value in values if value))


def retouch(source: Path, output: Path, session) -> None:
    image = ImageOps.exif_transpose(Image.open(source)).convert("RGB")
    image.thumbnail((2200, 2200), Image.Resampling.LANCZOS)
    gamma = 0.78
    image = image.point([round(255 * ((value / 255) ** gamma)) for value in range(256)] * 3)
    image = ImageEnhance.Color(image).enhance(1.16)
    image = ImageEnhance.Contrast(image).enhance(1.05)
    rgba = remove(image, session=session, alpha_matting=False).convert("RGBA")
    alpha = np.asarray(rgba.getchannel("A"))
    ys, xs = np.where(alpha > 12)
    if len(xs):
        left, top, right, bottom = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        pad_x = max(24, round((right - left) * 0.05))
        pad_y = max(24, round((bottom - top) * 0.05))
        rgba = rgba.crop((max(0, left - pad_x), max(0, top - pad_y), min(rgba.width, right + pad_x), min(rgba.height, bottom + pad_y)))
    rgba.thumbnail((1320, 1320), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (1600, 1600), "white")
    x, y = (1600 - rgba.width) // 2, (1600 - rgba.height) // 2
    shadow_alpha = rgba.getchannel("A").filter(ImageFilter.GaussianBlur(14)).point(lambda value: round(value * 0.12))
    shadow = Image.new("RGBA", rgba.size, (0, 0, 0, 0))
    shadow.putalpha(shadow_alpha)
    canvas.alpha_composite(shadow, (x + 7, y + 14))
    canvas.alpha_composite(rgba, (x, y))
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").filter(ImageFilter.UnsharpMask(1.0, 55, 4)).save(output, "WEBP", quality=94, method=6)


def main() -> None:
    env = load_env()
    query = ",".join(SLUGS)
    products = api(env, "GET", f"/rest/v1/products?slug=in.({query})&select=*")
    if len(products) != len(SLUGS):
        raise SystemExit(f"Expected {len(SLUGS)} products, found {len(products)}")
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_dir = BACKUP / stamp
    backup_dir.mkdir(parents=True, exist_ok=True)
    (backup_dir / "products-before.json").write_text(json.dumps(products, ensure_ascii=False, indent=2), encoding="utf-8")
    session = new_session("u2net")
    report = []
    for product in products:
        slug = product["slug"]
        urls = dedupe(
            [product.get("cover_image", "")]
            + (product.get("images") or [])
            + (product.get("gallery_images") or [])
            + (product.get("packaging_images") or [])
            + (product.get("lifestyle_images") or [])
        )
        if not urls:
            raise RuntimeError(f"No images for {slug}")
        published = []
        for index, url in enumerate(urls, 1):
            source = OUT / slug / f"source-{index:02d}{Path(urllib.parse.urlparse(url).path).suffix or '.jpg'}"
            source.parent.mkdir(parents=True, exist_ok=True)
            urllib.request.urlretrieve(url, source)
            output = OUT / slug / f"{index:02d}.webp"
            retouch(source, output, session)
            published.append(upload(env, output, f"{slug}/{VERSION}/{index:02d}.webp"))
        api(
            env,
            "PATCH",
            f"/rest/v1/products?slug=eq.{urllib.parse.quote(slug)}",
            {
                "cover_image": published[0],
                "images": published,
                "gallery_images": published[1:],
                "packaging_images": [],
                "lifestyle_images": [],
                "photo_checked": True,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
        )
        report.append({"slug": slug, "source_count": len(urls), "published": published})
        print(f"{slug}: {len(published)} image(s)")
    (OUT / "publish-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
