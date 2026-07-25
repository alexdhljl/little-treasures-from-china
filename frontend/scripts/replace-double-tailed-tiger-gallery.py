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
OUTPUT = ROOT / "outputs" / "double-tailed-tiger-user-gallery"
BACKUP = ROOT / "backup" / "double-tailed-tiger-user-gallery"
SLUG = "double-tailed-tiger-mini-stapler"
BUCKET = "product-images"
VERSION = "user-gallery-2026-07-25-v1"
SOURCES = [
    Path(r"C:\Users\alexd\AppData\Local\Temp\codex-clipboard-d789ed3b-e07c-48d2-9c38-f61d06792da0.jpg"),
    Path(r"C:\Users\alexd\AppData\Local\Temp\codex-clipboard-2cf98228-6dec-4da5-96a5-f5381a627942.jpg"),
    Path(r"C:\Users\alexd\AppData\Local\Temp\codex-clipboard-9f70b80a-b5be-442b-9e08-b4efc2790cc9.jpg"),
    Path(r"C:\Users\alexd\AppData\Local\Temp\codex-clipboard-7199affc-3888-463f-a786-357c70a7f97d.jpg"),
    Path(r"C:\Users\alexd\AppData\Local\Temp\codex-clipboard-a1506b92-946e-4a22-b5b4-552cfba6e78b.jpg"),
    Path(r"C:\Users\alexd\AppData\Local\Temp\codex-clipboard-4ac115fe-6cb9-4d29-b250-c4ed5d903c9f.jpg"),
    Path(r"C:\Users\alexd\AppData\Local\Temp\codex-clipboard-c52b4e39-5bb0-4693-a46e-5d16559a9c6a.jpg"),
]


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


def prepare(source: Path, destination: Path) -> dict[str, object]:
    image = ImageOps.exif_transpose(Image.open(source)).convert("RGB")
    original_size = image.size
    image.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, "WEBP", quality=94, method=6)
    return {"source": str(source), "original_size": original_size, "published_size": image.size}


def main() -> None:
    missing = [str(source) for source in SOURCES if not source.is_file()]
    if missing:
        raise FileNotFoundError(f"Missing uploaded files: {missing}")
    env = load_env()
    rows = request_json(env, "GET", f"/rest/v1/products?slug=eq.{SLUG}&select=*")
    if len(rows) != 1:
        raise RuntimeError(f"Expected one product, found {len(rows)}")
    product = rows[0]
    old_images = product.get("images") or []
    if not old_images:
        raise RuntimeError("The product does not have an existing cover image")
    first_image = old_images[0]

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_dir = BACKUP / stamp
    backup_dir.mkdir(parents=True, exist_ok=True)
    (backup_dir / "product-before.json").write_text(json.dumps(product, ensure_ascii=False, indent=2), encoding="utf-8")

    published: list[str] = []
    processing: list[dict[str, object]] = []
    for index, source in enumerate(SOURCES, 2):
        destination = OUTPUT / f"{index:02d}.webp"
        processing.append(prepare(source, destination))
        published.append(upload(env, destination, f"{SLUG}/{VERSION}/{index:02d}.webp"))

    images = [first_image, *published]
    updated = request_json(
        env,
        "PATCH",
        f"/rest/v1/products?slug=eq.{SLUG}",
        {
            "cover_image": first_image,
            "images": images,
            "gallery_images": images[1:],
            "packaging_images": [],
            "lifestyle_images": [],
            "photo_checked": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    report = {
        "slug": SLUG,
        "kept_cover": first_image,
        "old_image_count": len(old_images),
        "new_image_count": len(images),
        "processing": processing,
        "published": images,
        "updated": updated,
        "backup": str(backup_dir),
    }
    (OUTPUT / "publish-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
