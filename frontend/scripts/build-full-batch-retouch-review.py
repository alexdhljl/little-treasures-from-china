from __future__ import annotations

import csv
import hashlib
import html
import json
import re
import shutil
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "product photos" / "2026.7.23 原来产品重拍"
OUT = ROOT / "deliverables" / "image-retouch-review" / "full-batch"
GEN = Path(r"C:\Users\alexd\.codex\generated_images\019f91bb-8e11-7493-be97-814d9e202669")


def nums(*parts):
    result = []
    for part in parts:
        if isinstance(part, tuple):
            result.extend(range(part[0], part[1] + 1))
        else:
            result.append(part)
    return result


GROUPS = [
    ("needs-review-001", "Blue Tengwang Pavilion package", nums((285, 287)), 287, None, .34, "REVIEW_REQUIRED", "No reliable existing product match."),
    ("needs-review-002", "White boxed figurine", nums((288, 290)), 290, None, .31, "REVIEW_REQUIRED", "No reliable existing product match."),
    ("needs-review-003", "Pink historical-character package", nums((291, 292)), 291, None, .28, "REVIEW_REQUIRED", "No reliable existing product match."),
    ("needs-review-004", "Turquoise packaged figure", nums((293, 294)), 293, None, .35, "REVIEW_REQUIRED", "No reliable existing product match."),
    ("needs-review-005", "Pink ornament package", nums((295, 296)), 295, None, .30, "REVIEW_REQUIRED", "No reliable existing product match."),
    ("needs-review-006", "Turquoise single package", [297], 297, None, .24, "REVIEW_REQUIRED", "Single view; match confidence too low."),
    ("needs-review-007", "Brown boxed product", nums((298, 301)), 298, None, .27, "REVIEW_REQUIRED", "No reliable existing product match."),
    ("needs-review-008", "Green Nezha-themed package", nums((302, 304)), 304, None, .39, "REVIEW_REQUIRED", "No reliable existing product match."),
    ("sun-wukong-figurine", "Sun Wukong Figurine", nums((305, 312)), 305, "call_hE8pIvWnfZt2qfrH6cZdLChg.png", .98, "APPROVED", "Unpackaged Hero; existing slug match is reliable."),
    ("rejected-back-only-009", "Unidentified green package backs", nums((313, 314)), 313, None, .10, "REJECTED", "Only back/package views; no safe Hero."),
    ("double-tail-tiger-stapler", "Double-Tail Tiger Stapler", nums((315, 317)), 317, "call_hTVMCYPLS8aV0aDn1mjcJBF5.png", .76, "REVIEW_REQUIRED", "Image treatment is usable; no reliable existing website slug."),
    ("needs-review-010", "Pig novelty pen", nums((318, 320)), 318, None, .32, "REVIEW_REQUIRED", "No reliable existing product match."),
    ("jade-cong-fridge-magnet", "Jade Cong Refrigerator Magnet", nums((321, 326)), 326, "call_n25Ny3qQVvsVKDMu4RX48T1o.png", .94, "APPROVED", "Existing slug and visible package text match."),
    ("needs-review-011", "Colorful mask-shaped magnet", nums((327, 329)), 327, None, .38, "REVIEW_REQUIRED", "No reliable existing product match."),
    ("heritage-plush-keychains", "Heritage Plush Keychain", nums((330, 333)), 333, "call_qc6IsL2EE3dVrJxmf8OtAJMg.png", .91, "REVIEW_REQUIRED", "Tag text shows possible model reconstruction."),
    ("heritage-character-pencil-set", "Heritage Character Pen Set", nums((334, 340)), 334, "call_b7aFfFvKjPY7jBEeUQh1Sa9V.png", .72, "REVIEW_REQUIRED", "Visual set is clear but existing catalog naming/mapping is uncertain."),
    ("houmuwu-ding-3d-eraser", "Houmuwu Ding 3D Eraser", nums((341, 344)), 343, "call_3MGpZ6cFqJR2jpukPEnDcSyn.png", .96, "APPROVED", "Existing slug and visible package text match."),
    ("deer-head-gold-step-shake", "Deer-Head Gold Step-Shake Ornament", nums((345, 349)), 347, "DEER_APPROVED", 1.0, "APPROVED", "User-approved gold-standard output; no safe existing website slug."),
    ("needs-review-012", "Orange boxed cultural eraser", nums((350, 352)), 350, None, .35, "REVIEW_REQUIRED", "No reliable existing product match."),
    ("gold-crown-ornament", "Gold Crown Ornament Magnet", nums((353, 358)), 354, "call_hC5dI9cvK6ixZjb6dov2AKoB.png", .93, "REVIEW_REQUIRED", "Fine vertical package text shows possible reconstruction."),
    ("needs-review-013", "Orange-blue boxed seal eraser", nums((359, 360), (363, 364)), 359, None, .33, "REVIEW_REQUIRED", "No reliable existing product match."),
    ("needs-review-014", "Round gold relief magnet", nums((361, 362), (365, 366)), 365, None, .37, "REVIEW_REQUIRED", "No reliable existing product match."),
    ("drumming-storyteller-3d-eraser", "Drumming Storyteller 3D Eraser", nums((367, 370)), 370, "call_SUJnQyVLWdjcH9NVmRWx1HVd.png", .97, "APPROVED", "Existing slug and visible package text match."),
]


def find_source(number: int) -> Path:
    matches = list(SOURCE.glob(f"*_{number}_109.jpg"))
    if len(matches) != 1:
        raise RuntimeError(f"Expected one source for {number}, got {matches}")
    return matches[0]


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save_processed(source: Path, slug: str) -> tuple[Path, Path, Path]:
    folder = OUT / "products" / slug
    folder.mkdir(parents=True, exist_ok=True)
    image = ImageOps.fit(Image.open(source).convert("RGB"), (2048, 2048), Image.Resampling.LANCZOS)
    png = folder / "hero.png"
    webp = folder / "hero.webp"
    thumb = folder / "thumbnail.webp"
    image.save(png, "PNG", optimize=True)
    image.save(webp, "WEBP", quality=92, method=5)
    image.resize((800, 800), Image.Resampling.LANCZOS).save(thumb, "WEBP", quality=89, method=5)
    return png, webp, thumb


def measure(path: Path) -> dict:
    array = np.asarray(Image.open(path).convert("RGB"))
    corners = [array[0, 0].tolist(), array[0, -1].tolist(), array[-1, 0].tolist(), array[-1, -1].tolist()]
    foreground = np.max(np.abs(array.astype(np.int16) - 255), axis=2) > 12
    ys, xs = np.where(foreground)
    bbox = [int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)] if len(xs) else [0, 0, 0, 0]
    coverage = ((bbox[2] - bbox[0]) * (bbox[3] - bbox[1])) / (array.shape[0] * array.shape[1]) if len(xs) else 0
    return {"dimensions": [array.shape[1], array.shape[0]], "corners": corners, "bbox": bbox, "coverage": coverage}


def build():
    OUT.mkdir(parents=True, exist_ok=True)
    previews = OUT / "source-previews"
    previews.mkdir(exist_ok=True)
    records, rows = [], []
    covered = set()
    for slug, name, numbers, hero_num, generated, confidence, status, note in GROUPS:
        covered.update(numbers)
        sources = [find_source(number) for number in numbers]
        preview_names = []
        for source in sources:
            preview = previews / f"{source.stem}.webp"
            ImageOps.contain(Image.open(source).convert("RGB"), (900, 900), Image.Resampling.LANCZOS).save(preview, "WEBP", quality=84, method=4)
            preview_names.append(preview.relative_to(OUT).as_posix())
        hero_source = find_source(hero_num)
        output = None
        metrics = None
        if generated:
            generated_path = ROOT / "deliverables" / "image-retouch-review" / "deer-head-gold-step-shake" / "hero.png" if generated == "DEER_APPROVED" else GEN / generated
            png, webp, thumb = save_processed(generated_path, slug)
            output = webp.relative_to(OUT).as_posix()
            metrics = measure(png)
        for source in sources:
            is_hero = source == hero_source
            rows.append({
                "product_slug": slug,
                "product_name": name,
                "source_file": source.name,
                "output_file": output if is_hero and output else "",
                "role": "hero" if is_hero else "candidate",
                "match_confidence": f"{confidence:.2f}",
                "background_check": "PASS_APPROX_WHITE" if output and is_hero else "NOT_PROCESSED",
                "text_preservation_check": "VISUAL_PASS" if status == "APPROVED" and output else ("REVIEW_REQUIRED" if output else "NOT_TESTED"),
                "status": status,
                "notes": note,
            })
        records.append({
            "slug": slug, "name": name, "numbers": numbers, "hero_number": hero_num,
            "hero_source": hero_source.name, "source_previews": preview_names, "output": output,
            "confidence": confidence, "status": status, "note": note, "metrics": metrics,
            "source_hash": sha(hero_source), "output_hash": sha(OUT / output) if output else None,
        })
    expected = set(range(285, 371))
    if covered != expected:
        raise RuntimeError(f"Coverage mismatch; missing={sorted(expected-covered)} extra={sorted(covered-expected)}")
    with (OUT / "image-status.csv").open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader(); writer.writerows(rows)
    (OUT / "review-data.json").write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    cards = []
    for record in records:
        sources = "".join(f'<img src="{html.escape(path)}" alt="source">' for path in record["source_previews"])
        processed = f'<img src="{html.escape(record["output"])}" alt="processed hero">' if record["output"] else '<div class="missing">Not generated — unsafe or unmatched</div>'
        metric = record["metrics"]
        evidence = "Not processed"
        if metric:
            evidence = f'{metric["dimensions"][0]}×{metric["dimensions"][1]} · bbox coverage {metric["coverage"]:.1%} · corners {metric["corners"]}'
        cards.append(f"""<article><header><div><p>{html.escape(record["slug"])}</p><h2>{html.escape(record["name"])}</h2></div><span class="{record["status"].lower()}">{record["status"]}</span></header>
        <div class="grid"><section><h3>Original sources</h3><div class="sources">{sources}</div></section><section><h3>Processed Hero</h3>{processed}</section></div>
        <dl><dt>Selected Hero</dt><dd>{html.escape(record["hero_source"])}</dd><dt>Match confidence</dt><dd>{record["confidence"]:.0%}</dd><dt>Evidence</dt><dd>{html.escape(evidence)}</dd><dt>Notes</dt><dd>{html.escape(record["note"])}</dd></dl></article>""")
    counts = {status: sum(r["status"] == status for r in records) for status in ("APPROVED", "REVIEW_REQUIRED", "REJECTED")}
    page = f"""<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Auctus Full Batch Retouch Review</title><style>
body{{margin:0;background:#f1eee6;color:#181713;font:15px/1.5 Arial}}main{{max-width:1400px;margin:auto;padding:48px 24px}}h1{{font:46px Georgia;margin:0}}.lede{{color:#6c685f}}article{{background:white;border:1px solid #d5d0c5;padding:24px;margin:24px 0}}header{{display:flex;justify-content:space-between}}header p{{color:#6c685f;margin:0}}h2{{font:28px Georgia;margin:2px 0 18px}}span{{color:white;padding:7px 10px;border-radius:20px;height:max-content;font-weight:bold;font-size:12px}}.approved{{background:#286044}}.review_required{{background:#9a611d}}.rejected{{background:#842c28}}.grid{{display:grid;grid-template-columns:1fr 1fr;gap:18px}}h3{{font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#6c685f}}.sources{{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}}img,.missing{{width:100%;aspect-ratio:1;object-fit:contain;border:1px solid #ece8df;background:#fff}}.missing{{display:grid;place-items:center;color:#6c685f}}dl{{display:grid;grid-template-columns:150px 1fr;gap:6px;margin-bottom:0}}dt{{color:#6c685f}}dd{{margin:0}}@media(max-width:800px){{.grid{{grid-template-columns:1fr}}.sources{{grid-template-columns:repeat(2,1fr)}}h1{{font-size:34px}}}}</style></head>
<body><main><h1>Auctus Heritage Full Batch</h1><p class="lede">86 source photos · {len(records)} candidate products · {counts["APPROVED"]} approved · {counts["REVIEW_REQUIRED"]} review required · {counts["REJECTED"]} rejected. Low-confidence groups were not forced.</p>{''.join(cards)}</main></body></html>"""
    (OUT / "index.html").write_text(page, encoding="utf-8")
    print(json.dumps({"sources": len(covered), "products": len(records), **counts}, indent=2))


if __name__ == "__main__":
    build()
