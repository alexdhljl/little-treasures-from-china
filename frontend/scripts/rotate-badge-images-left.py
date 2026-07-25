from __future__ import annotations

import json
import mimetypes
import os
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[2]
FRONTEND = ROOT / "frontend"
OUT = ROOT / "outputs" / "badge-images-left-90"
BACKUP = ROOT / "backup" / "badge-images-left-90"
BUCKET = "product-images"
SLUG = "fu-hao-owl-zun-gift-box"
VERSION = "left-90-2026-07-25-v1"


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for line in (FRONTEND / ".env.local").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            env[key] = value.strip().strip("'\"")
    env.update(os.environ)
    return env


def request_json(env: dict[str, str], method: str, path: str, payload: object | None = None):
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


def main() -> None:
    env = load_env()
    rows = request_json(env, "GET", f"/rest/v1/products?slug=eq.{SLUG}&select=*")
    if len(rows) != 1:
        raise RuntimeError(f"Expected one product, found {len(rows)}")
    product = rows[0]
    urls = list(dict.fromkeys(product.get("images") or []))
    if len(urls) != 3:
        raise RuntimeError(f"Expected exactly three images, found {len(urls)}")

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_dir = BACKUP / stamp
    backup_dir.mkdir(parents=True, exist_ok=True)
    (backup_dir / "product-before.json").write_text(json.dumps(product, ensure_ascii=False, indent=2), encoding="utf-8")

    published: list[str] = []
    for index, url in enumerate(urls, 1):
        suffix = Path(urllib.parse.urlparse(url).path).suffix or ".jpg"
        source = backup_dir / f"source-{index:02d}{suffix}"
        urllib.request.urlretrieve(url, source)
        image = ImageOps.exif_transpose(Image.open(source)).convert("RGB")
        rotated = image.transpose(Image.Transpose.ROTATE_90)
        output = OUT / f"{index:02d}.webp"
        output.parent.mkdir(parents=True, exist_ok=True)
        rotated.save(output, "WEBP", quality=95, method=6)
        published.append(upload(env, output, f"{SLUG}/{VERSION}/{index:02d}.webp"))

    updated = request_json(
        env,
        "PATCH",
        f"/rest/v1/products?slug=eq.{SLUG}",
        {
            "cover_image": published[0],
            "images": published,
            "gallery_images": published[1:],
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    (OUT / "publish-report.json").write_text(
        json.dumps({"slug": SLUG, "before": urls, "after": published, "updated": updated}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps({"slug": SLUG, "count": len(published), "backup": str(backup_dir), "published": published}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
