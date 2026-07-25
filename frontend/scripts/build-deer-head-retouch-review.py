from __future__ import annotations

import hashlib
import html
import json
import shutil
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "deliverables" / "image-retouch-review"
PRODUCT = OUT / "deer-head-gold-step-shake"
SOURCE_DIR = ROOT / "product photos" / "2026.7.23 原来产品重拍"
GENERATED = Path(r"C:\Users\alexd\.codex\generated_images\019f91bb-8e11-7493-be97-814d9e202669")

ITEMS = [
    {
        "key": "hero",
        "source": SOURCE_DIR / "微信图片_20260723202205_347_109.jpg",
        "generated": GENERATED / "call_MWsa3VCJFPf0xbbULOuR8GrX.png",
        "png": "hero.png",
        "webp": "hero.webp",
        "destination": "product-images/deer-head-gold-step-shake/hero.webp",
        "ocr": "Main visible text appears consistent by visual review; automated character-level preservation is not proven.",
        "warnings": [
            "Reference-image model may have reconstructed glitter texture and micro-details.",
            "Requires manual pixel-level comparison before publication.",
        ],
    },
    {
        "key": "gallery-01",
        "source": SOURCE_DIR / "微信图片_20260723202207_348_109.jpg",
        "generated": GENERATED / "call_Q59rNWIoclV5n32Jfg0J0Pwy.png",
        "png": "gallery-01.png",
        "webp": "gallery-01.webp",
        "destination": "product-images/deer-head-gold-step-shake/gallery-01.webp",
        "ocr": "NOT CONSISTENT: small Chinese text shows visible model reconstruction.",
        "warnings": [
            "NEEDS_MANUAL_RETOUCH: small printed characters are not reliably preserved.",
            "Glitter distribution cannot be certified as identical to the source.",
        ],
    },
    {
        "key": "packaging-review",
        "source": SOURCE_DIR / "微信图片_20260723202202_345_109.jpg",
        "generated": GENERATED / "call_WWAaDPP318bczJxo6nJYfjbY.png",
        "png": "packaging-review.png",
        "webp": None,
        "destination": "product-images/deer-head-gold-step-shake/packaging.webp (proposed only)",
        "ocr": "NOT CONSISTENT: fine package text and underlying card text are not reliably preserved.",
        "warnings": [
            "NEEDS_MANUAL_RETOUCH: transparent plastic and fine text were model-reconstructed.",
            "Review-only file; must not be published.",
        ],
    },
]


def digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            value.update(block)
    return value.hexdigest()


def normalize_generated(source: Path, destination: Path, size: int = 2048) -> None:
    image = Image.open(source).convert("RGB")
    image = ImageOps.fit(image, (size, size), Image.Resampling.LANCZOS)
    image.save(destination, "PNG", optimize=True)


def measurements(path: Path) -> dict:
    image = Image.open(path).convert("RGB")
    array = np.asarray(image)
    corner_points = [
        array[0, 0].tolist(),
        array[0, -1].tolist(),
        array[-1, 0].tolist(),
        array[-1, -1].tolist(),
    ]
    delta = np.max(np.abs(array.astype(np.int16) - 255), axis=2)
    foreground = delta > 12
    ys, xs = np.where(foreground)
    if len(xs):
        bbox = [int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)]
        bbox_coverage = ((bbox[2] - bbox[0]) * (bbox[3] - bbox[1])) / (image.width * image.height)
        pixel_coverage = float(foreground.mean())
    else:
        bbox = [0, 0, 0, 0]
        bbox_coverage = pixel_coverage = 0.0
    return {
        "dimensions": [image.width, image.height],
        "corners": corner_points,
        "bbox": bbox,
        "bbox_coverage": bbox_coverage,
        "pixel_coverage": pixel_coverage,
    }


def make_detail(source: Path, destination: Path) -> None:
    image = Image.open(source).convert("RGB")
    width, height = image.size
    crop = image.crop((int(width * 0.20), int(height * 0.10), int(width * 0.82), int(height * 0.72)))
    ImageOps.fit(crop, (900, 700), Image.Resampling.LANCZOS).save(destination, "WEBP", quality=92, method=5)


def build() -> None:
    PRODUCT.mkdir(parents=True, exist_ok=True)
    records = []
    for item in ITEMS:
        png_path = PRODUCT / item["png"]
        normalize_generated(item["generated"], png_path)
        if item["webp"]:
            Image.open(png_path).save(PRODUCT / item["webp"], "WEBP", quality=92, method=5)
        detail_path = PRODUCT / f'{item["key"]}-detail.webp'
        make_detail(png_path, detail_path)
        source_copy = PRODUCT / f'{item["key"]}-original{item["source"].suffix.lower()}'
        shutil.copy2(item["source"], source_copy)
        info = measurements(png_path)
        public_item = {key: value for key, value in item.items() if key not in {"generated"}}
        records.append(
            {
                **public_item,
                "source": source_copy.name,
                "output": png_path.name,
                "detail": detail_path.name,
                "source_sha256": digest(source_copy),
                "output_sha256": digest(png_path),
                **info,
            }
        )
    hero = Image.open(PRODUCT / "hero.png")
    hero.resize((800, 800), Image.Resampling.LANCZOS).save(PRODUCT / "thumbnail.webp", "WEBP", quality=90, method=5)
    (OUT / "review-data.json").write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    cards = []
    for record in records:
        corners = ", ".join(f"RGB({','.join(map(str, rgb))})" for rgb in record["corners"])
        warnings = "".join(f"<li>{html.escape(warning)}</li>" for warning in record["warnings"])
        cards.append(
            f"""
            <article>
              <div class="title"><div><p class="eyebrow">{html.escape(record["key"])}</p><h2>{html.escape(record["output"])}</h2></div><span>NEEDS MANUAL RETOUCH</span></div>
              <div class="visuals">
                <figure><img src="deer-head-gold-step-shake/{html.escape(record["source"])}"><figcaption>Original source</figcaption></figure>
                <figure><img src="deer-head-gold-step-shake/{html.escape(record["output"])}"><figcaption>Processed test</figcaption></figure>
                <figure><img src="deer-head-gold-step-shake/{html.escape(record["detail"])}"><figcaption>Processed detail zoom</figcaption></figure>
              </div>
              <div class="evidence">
                <dl>
                  <dt>Source filename</dt><dd>{html.escape(record["source"])}</dd>
                  <dt>Output dimensions</dt><dd>{record["dimensions"][0]} × {record["dimensions"][1]} px</dd>
                  <dt>Detected bounding box</dt><dd>{record["bbox"]}</dd>
                  <dt>Bounding-box coverage</dt><dd>{record["bbox_coverage"]:.1%}</dd>
                  <dt>Non-white pixel coverage</dt><dd>{record["pixel_coverage"]:.1%}</dd>
                  <dt>Corner verification</dt><dd>{corners}</dd>
                  <dt>Source SHA-256</dt><dd><code>{record["source_sha256"]}</code></dd>
                  <dt>Output SHA-256</dt><dd><code>{record["output_sha256"]}</code></dd>
                  <dt>Hashes differ</dt><dd>{"YES" if record["source_sha256"] != record["output_sha256"] else "NO"}</dd>
                  <dt>OCR-visible text</dt><dd>{html.escape(record["ocr"])}</dd>
                  <dt>Proposed destination</dt><dd>{html.escape(record["destination"])}</dd>
                </dl>
                <div class="warnings"><h3>Warnings</h3><ul>{warnings}</ul></div>
              </div>
            </article>"""
        )
    page = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Deer-Head Gold Step-Shake — Retouch Review</title><style>
:root{{--paper:#f2efe7;--ink:#171713;--muted:#6c685f;--line:#d4cec0;--red:#8e2c23}}*{{box-sizing:border-box}}
body{{margin:0;background:var(--paper);color:var(--ink);font:15px/1.5 Arial,sans-serif}}main{{max-width:1480px;margin:auto;padding:52px 24px}}
h1{{font:48px/1.04 Georgia,serif;margin:0 0 12px;max-width:900px}}.lede{{color:var(--muted);max-width:900px;margin-bottom:40px}}
article{{background:#fff;border:1px solid var(--line);padding:26px;margin-bottom:28px}}.title{{display:flex;justify-content:space-between;gap:18px;align-items:start}}
.eyebrow{{text-transform:uppercase;letter-spacing:.14em;color:var(--muted);font-size:12px;margin:0}}h2{{font:28px Georgia,serif;margin:3px 0 22px}}
span{{background:var(--red);color:#fff;padding:8px 12px;border-radius:999px;font-weight:bold;font-size:12px}}.visuals{{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}}
figure{{margin:0}}figure img{{width:100%;aspect-ratio:1;object-fit:contain;background:#fff;border:1px solid #ebe7df}}figcaption{{color:var(--muted);padding-top:6px}}
.evidence{{display:grid;grid-template-columns:2fr 1fr;gap:30px;margin-top:24px}}dl{{display:grid;grid-template-columns:190px minmax(0,1fr);gap:7px 14px;margin:0}}
dt{{color:var(--muted)}}dd{{margin:0;overflow-wrap:anywhere}}code{{font-size:12px}}.warnings{{border-left:3px solid var(--red);padding-left:20px}}.warnings h3{{margin-top:0}}
@media(max-width:900px){{.visuals,.evidence{{grid-template-columns:1fr}}dl{{grid-template-columns:1fr}}h1{{font-size:36px}}}}</style></head>
<body><main><p class="eyebrow">Auctus Heritage · single-product gate</p><h1>鹿首金步摇饰<br>Deer-Head Gold Step-Shake Ornament</h1>
<p class="lede">Reference-image editing test only. The background was visibly replaced with a white studio canvas, but the editing model cannot certify pixel-identical text, glitter, or micro-detail preservation. No website files were changed.</p>
{''.join(cards)}</main></body></html>"""
    (OUT / "index.html").write_text(page, encoding="utf-8")


if __name__ == "__main__":
    build()
