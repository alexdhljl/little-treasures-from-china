from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "outputs" / "site-image-audit" / "source"
OUTPUT = ROOT / "outputs" / "site-image-audit" / "all-product-covers.jpg"

files = sorted(SOURCE.glob("*.*"))
tile_w, tile_h, caption_h, columns = 260, 220, 48, 5
rows = (len(files) + columns - 1) // columns
sheet = Image.new("RGB", (columns * tile_w, rows * (tile_h + caption_h)), "white")
draw = ImageDraw.Draw(sheet)
font = ImageFont.load_default()

for index, file in enumerate(files):
    image = Image.open(file).convert("RGB")
    image.thumbnail((tile_w - 20, tile_h - 20), Image.Resampling.LANCZOS)
    x = (index % columns) * tile_w
    y = (index // columns) * (tile_h + caption_h)
    sheet.paste(image, (x + (tile_w - image.width) // 2, y + (tile_h - image.height) // 2))
    draw.rectangle((x, y, x + tile_w - 1, y + tile_h + caption_h - 1), outline="#d8d8d8")
    label = file.stem
    lines = [label[i:i + 34] for i in range(0, len(label), 34)][:2]
    draw.multiline_text((x + 7, y + tile_h + 5), "\n".join(lines), fill="#111111", font=font, spacing=2)

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
sheet.save(OUTPUT, quality=90, optimize=True)
print(f"{len(files)} covers -> {OUTPUT}")
