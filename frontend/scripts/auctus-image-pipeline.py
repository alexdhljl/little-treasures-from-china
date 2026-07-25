"""Auctus Image Pipeline v2.1.

Non-generative, review-first product photo processing. It never mutates website
assets; replacement is intentionally a separate, approval-gated future step.
"""

from __future__ import annotations

import argparse
import html
import json
import math
import re
import shutil
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageOps, ImageStat

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".heic"}


@dataclass
class Metrics:
    sharpness: float
    brightness: float
    background: float
    centering: float
    visibility: float
    symmetry: float
    hero_score: float


def natural_key(path: Path) -> list[object]:
    return [int(part) if part.isdigit() else part.lower() for part in re.split(r"(\d+)", path.name)]


def open_rgb(path: Path) -> Image.Image:
    return ImageOps.exif_transpose(Image.open(path)).convert("RGB")


def analysis_array(image: Image.Image, size: int = 320) -> np.ndarray:
    preview = ImageOps.contain(image, (size, size), Image.Resampling.LANCZOS)
    return np.asarray(preview, dtype=np.float32)


def foreground_mask(array: np.ndarray) -> np.ndarray:
    h, w, _ = array.shape
    edge = max(4, min(h, w) // 12)
    corners = np.concatenate(
        [
            array[:edge, :edge].reshape(-1, 3),
            array[:edge, -edge:].reshape(-1, 3),
            array[-edge:, :edge].reshape(-1, 3),
            array[-edge:, -edge:].reshape(-1, 3),
        ]
    )
    background = np.median(corners, axis=0)
    color_delta = np.sqrt(np.sum((array - background) ** 2, axis=2))
    luminance = array.mean(axis=2)
    threshold = max(20.0, float(np.percentile(color_delta, 68)))
    mask = (color_delta > threshold) | (luminance < np.percentile(luminance, 32))
    # Conservative expansion keeps real edges and soft natural contact shadows.
    expanded = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7))
    return np.asarray(expanded) > 30


def metrics(image: Image.Image) -> Metrics:
    array = analysis_array(image)
    gray = array.mean(axis=2)
    gx = np.diff(gray, axis=1)
    gy = np.diff(gray, axis=0)
    sharpness = min(1.0, (float(gx.var() + gy.var()) / 900.0))
    brightness = 1.0 - min(1.0, abs(float(gray.mean()) - 210.0) / 150.0)
    mask = foreground_mask(array)
    visibility = min(1.0, max(0.0, float(mask.mean()) / 0.55))
    ys, xs = np.where(mask)
    if len(xs):
        cx, cy = xs.mean() / mask.shape[1], ys.mean() / mask.shape[0]
        centering = 1.0 - min(1.0, math.hypot(cx - 0.5, cy - 0.5) * 2.2)
        left = mask[:, : mask.shape[1] // 2].mean()
        right = mask[:, -mask.shape[1] // 2 :].mean()
        symmetry = 1.0 - min(1.0, abs(float(left - right)) * 4)
    else:
        centering = symmetry = 0.0
    border = np.concatenate([array[0], array[-1], array[:, 0], array[:, -1]])
    background = 1.0 - min(1.0, float(border.std()) / 55.0)
    score = (
        sharpness * 0.30
        + brightness * 0.14
        + background * 0.14
        + centering * 0.18
        + visibility * 0.14
        + symmetry * 0.10
    )
    return Metrics(sharpness, brightness, background, centering, visibility, symmetry, score)


def histogram(image: Image.Image) -> np.ndarray:
    preview = analysis_array(image, 240)
    mask = foreground_mask(preview)
    ys, xs = np.where(mask)
    if len(xs):
        crop = image.crop(
            (
                int(xs.min() / mask.shape[1] * image.width),
                int(ys.min() / mask.shape[0] * image.height),
                max(1, int((xs.max() + 1) / mask.shape[1] * image.width)),
                max(1, int((ys.max() + 1) / mask.shape[0] * image.height)),
            )
        )
    else:
        crop = image
    small = ImageOps.fit(crop, (96, 96), Image.Resampling.LANCZOS)
    values = []
    array = np.asarray(small)
    for index in range(3):
        hist, _ = np.histogram(array[:, :, index], bins=16, range=(0, 256), density=True)
        values.extend(hist)
    vector = np.asarray(values, dtype=np.float32)
    return vector / max(float(np.linalg.norm(vector)), 1e-6)


def visual_distance(first: Image.Image, second: Image.Image) -> float:
    return 1.0 - float(np.dot(histogram(first), histogram(second)))


def group_sequential(files: list[Path]) -> list[list[Path]]:
    """Group anonymous burst photos using conservative adjacent visual changes."""
    if not files:
        return []
    images = [open_rgb(path) for path in files]
    distances = [visual_distance(images[i - 1], images[i]) for i in range(1, len(images))]
    baseline = float(np.median(distances)) if distances else 0.0
    threshold = max(0.11, baseline * 1.55)
    groups: list[list[Path]] = [[files[0]]]
    for index, path in enumerate(files[1:], start=1):
        current = groups[-1]
        # A group cap prevents long runs of visually similar packages merging.
        split = distances[index - 1] > threshold or len(current) >= 5
        if split:
            groups.append([path])
        else:
            current.append(path)
    return groups


def source_number(path: Path) -> int | None:
    match = re.search(r"_(\d+)_\d+$", path.stem)
    return int(match.group(1)) if match else None


def load_catalog(catalog_path: Path, root: Path) -> list[dict]:
    if not catalog_path.exists():
        return []
    products = json.loads(catalog_path.read_text(encoding="utf-8"))
    result = []
    for product in products:
        refs = []
        for raw in product.get("source_files", []):
            path = root / raw
            if path.exists():
                refs.append(path)
        if not refs:
            for planned in product.get("planned_images", []):
                path = Path(planned.get("originalPath", ""))
                if path.exists():
                    refs.append(path)
        if refs:
            result.append({"slug": product.get("slug"), "name": product.get("name") or product.get("englishName"), "refs": refs})
    return result


def match_group(group: list[Path], catalog: list[dict]) -> tuple[dict | None, float]:
    if not catalog:
        return None, 0.0
    hero = max((open_rgb(path) for path in group), key=lambda image: metrics(image).hero_score)
    ranked = []
    for product in catalog:
        distances = [visual_distance(hero, open_rgb(path)) for path in product["refs"][:3]]
        ranked.append((min(distances), product))
    ranked.sort(key=lambda item: item[0])
    best_distance, best = ranked[0]
    confidence = max(0.0, 1.0 - best_distance / 0.35)
    if len(ranked) > 1:
        margin = ranked[1][0] - best_distance
        confidence *= min(1.0, max(0.25, margin / 0.08))
    return best, confidence


def enhance(image: Image.Image, canvas: int) -> Image.Image:
    """Conservative catalog correction; pixels are adjusted, never invented."""
    image = ImageOps.exif_transpose(image).convert("RGB")
    preview = analysis_array(image, 640)
    mask_small = foreground_mask(preview)
    ys, xs = np.where(mask_small)
    if len(xs):
        scale_x = image.width / mask_small.shape[1]
        scale_y = image.height / mask_small.shape[0]
        left, right = int(xs.min() * scale_x), int((xs.max() + 1) * scale_x)
        top, bottom = int(ys.min() * scale_y), int((ys.max() + 1) * scale_y)
        pad_x = max(24, int((right - left) * 0.16))
        pad_y = max(24, int((bottom - top) * 0.16))
        box = (max(0, left - pad_x), max(0, top - pad_y), min(image.width, right + pad_x), min(image.height, bottom + pad_y))
        image = image.crop(box)
    # Neutralize only broad color cast, avoiding aggressive per-object recoloring.
    stat = ImageStat.Stat(image.resize((64, 64)))
    means = stat.mean
    target = sum(means) / 3
    gains = [min(1.08, max(0.92, target / max(value, 1))) for value in means]
    array = np.asarray(image, dtype=np.float32)
    array *= np.asarray(gains, dtype=np.float32)
    image = Image.fromarray(np.clip(array, 0, 255).astype(np.uint8))
    image = ImageEnhance.Brightness(image).enhance(1.035)
    image = ImageEnhance.Contrast(image).enhance(1.025)
    image = image.filter(ImageFilter.MedianFilter(3))
    image = image.filter(ImageFilter.UnsharpMask(radius=1.2, percent=65, threshold=4))
    contained = ImageOps.contain(image, (int(canvas * 0.82), int(canvas * 0.82)), Image.Resampling.LANCZOS)
    output = Image.new("RGB", (canvas, canvas), "#FFFFFF")
    output.paste(contained, ((canvas - contained.width) // 2, (canvas - contained.height) // 2))
    return output


def safe_slug(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "needs-review"


def report_html(run_name: str, records: list[dict]) -> str:
    cards = []
    for record in records:
        old = record.get("old_preview")
        old_markup = f'<img src="{html.escape(old)}" alt="Old">' if old else '<div class="missing">No reliable old-image match</div>'
        status = "Pass" if record["status"] == "pass" else "Needs Review"
        cards.append(
            f"""<article class="card">
<header><div><h2>{html.escape(record["product_name"])}</h2><p>{html.escape(record["slug"])}</p></div><span class="{record["status"]}">{status}</span></header>
<div class="compare"><section><h3>Old / reference</h3>{old_markup}</section><b>→</b><section><h3>New hero</h3><img src="{html.escape(record["hero"])}" alt="New"></section></div>
<dl><dt>Match confidence</dt><dd>{record["match_confidence"]:.0%}</dd><dt>Hero score</dt><dd>{record["hero_score"]:.0%}</dd><dt>Source files</dt><dd>{html.escape(", ".join(record["sources"]))}</dd></dl>
</article>"""
        )
    payload = html.escape(json.dumps(records, ensure_ascii=False))
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Auctus Image Pipeline review</title><style>
:root{{--ink:#181713;--muted:#6d6a61;--paper:#f4f1e9;--line:#d8d3c7;--green:#245a42;--amber:#8a5416}}*{{box-sizing:border-box}}
body{{margin:0;background:var(--paper);color:var(--ink);font:15px/1.5 Arial,sans-serif}}main{{max-width:1240px;margin:auto;padding:48px 24px}}
h1{{font:44px/1.05 Georgia,serif;margin:0 0 10px}}.lede{{color:var(--muted);margin-bottom:36px}}.card{{background:white;border:1px solid var(--line);padding:24px;margin:0 0 24px}}
header{{display:flex;justify-content:space-between;gap:20px;align-items:start}}h2{{font:27px Georgia,serif;margin:0}}header p{{margin:3px 0 20px;color:var(--muted)}}
span{{padding:7px 12px;border-radius:999px;color:white;font-weight:bold}}span.pass{{background:var(--green)}}span.review{{background:var(--amber)}}
.compare{{display:grid;grid-template-columns:1fr 28px 1fr;align-items:center;gap:12px}}section h3{{font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:var(--muted)}}
img,.missing{{width:100%;aspect-ratio:1;object-fit:contain;background:#fff;border:1px solid #ece9e1}}.missing{{display:grid;place-items:center;color:var(--muted)}}dl{{display:grid;grid-template-columns:150px 1fr;gap:5px;margin-bottom:0}}dt{{color:var(--muted)}}dd{{margin:0}}
@media(max-width:700px){{.compare{{grid-template-columns:1fr}}.compare>b{{display:none}}h1{{font-size:34px}}}}</style></head>
<body><main><h1>Auctus Image Pipeline v2.1</h1><p class="lede">{html.escape(run_name)} · Review only. No website files were replaced.</p>
{''.join(cards)}<script type="application/json" id="review-data">{payload}</script></main></body></html>"""


def run(args: argparse.Namespace) -> dict:
    root = Path(args.root).resolve()
    input_dir = (root / args.input).resolve()
    if not input_dir.is_dir():
        raise SystemExit(f"Input folder not found: {input_dir}")
    files = sorted([p for p in input_dir.rglob("*") if p.suffix.lower() in IMAGE_EXTENSIONS], key=natural_key)
    if not files:
        raise SystemExit(f"No supported images found in: {input_dir}")
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    run_name = args.run_name or f"run-{stamp}"
    run_dir = root / "outputs" / "auctus-image-pipeline-v2.1" / run_name
    backup_dir = root / "backup" / "auctus-image-pipeline-v2.1" / run_name / "input"
    run_dir.mkdir(parents=True, exist_ok=False)
    backup_dir.mkdir(parents=True, exist_ok=False)
    for path in files:
        shutil.copy2(path, backup_dir / path.name)
    catalog = load_catalog(root / args.catalog, root)
    records = []
    for index, group in enumerate(group_sequential(files), start=1):
        matched, confidence = match_group(group, catalog)
        slug = matched["slug"] if matched and confidence >= args.match_threshold else f"needs-review-{index:03d}"
        product_name = matched["name"] if matched and confidence >= args.match_threshold else f"Unmatched product {index:03d}"
        product_dir = run_dir / safe_slug(slug)
        product_dir.mkdir(parents=True)
        scored = [(path, metrics(open_rgb(path))) for path in group]
        scored.sort(key=lambda item: item[1].hero_score, reverse=True)
        for image_index, (path, score) in enumerate(scored):
            name = "hero" if image_index == 0 else f"gallery-{image_index:02d}"
            output = enhance(open_rgb(path), 2048)
            output.save(product_dir / f"{name}.webp", "WEBP", quality=91, method=4)
            output.save(product_dir / f"{name}.jpg", "JPEG", quality=93, optimize=True)
            if image_index == 0:
                enhance(open_rgb(path), 600).save(product_dir / "thumbnail.webp", "WEBP", quality=86, method=4)
        old_preview = None
        if matched:
            reference = matched["refs"][0]
            old_copy = product_dir / f"old-reference{reference.suffix.lower()}"
            shutil.copy2(reference, old_copy)
            old_preview = old_copy.relative_to(run_dir).as_posix()
        status = "pass" if confidence >= args.match_threshold and scored[0][1].hero_score >= args.hero_threshold else "review"
        records.append(
            {
                "slug": slug,
                "product_name": product_name,
                "status": status,
                "match_confidence": confidence,
                "hero_score": scored[0][1].hero_score,
                "hero": (product_dir / "hero.webp").relative_to(run_dir).as_posix(),
                "old_preview": old_preview,
                "sources": [path.name for path, _ in scored],
                "source_numbers": [source_number(path) for path, _ in scored],
                "metrics": {path.name: asdict(score) for path, score in scored},
            }
        )
    (run_dir / "manifest.json").write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    (run_dir / "report.html").write_text(report_html(run_name, records), encoding="utf-8")
    (run_dir / "APPROVAL_REQUIRED.txt").write_text(
        "STOP: Website replacement is not part of this run.\n"
        "Review report.html and explicitly approve Step 7 before any website image is changed.\n",
        encoding="utf-8",
    )
    summary = {
        "run": run_name,
        "input_images": len(files),
        "product_groups": len(records),
        "pass": sum(r["status"] == "pass" for r in records),
        "needs_review": sum(r["status"] == "review" for r in records),
        "output": str(run_dir),
        "backup": str(backup_dir.parent),
        "website_replaced": False,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Build premium, review-first product image exports.")
    parser.add_argument("--root", default=str(Path(__file__).resolve().parents[2]))
    parser.add_argument("--input", default=r"product photos\2026.7.23 原来产品重拍")
    parser.add_argument("--catalog", default=r"organized-products\products-import.json")
    parser.add_argument("--run-name")
    parser.add_argument("--match-threshold", type=float, default=0.58)
    parser.add_argument("--hero-threshold", type=float, default=0.52)
    args = parser.parse_args()
    run(args)


if __name__ == "__main__":
    main()
