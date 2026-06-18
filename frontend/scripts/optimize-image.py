import argparse
from pathlib import Path
from PIL import Image, ImageOps


def save_webp(source: Path, output: Path, max_width: int, quality: int) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        image = ImageOps.exif_transpose(image)
        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGB")
        width, height = image.size
        if width > max_width:
            ratio = max_width / float(width)
            image = image.resize((max_width, max(1, int(height * ratio))), Image.LANCZOS)
        image.save(output, "WEBP", quality=quality, method=6)


def main() -> None:
    parser = argparse.ArgumentParser(description="Optimize a product image to WebP.")
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--max-width", type=int, default=1600)
    parser.add_argument("--quality", type=int, default=88)
    args = parser.parse_args()

    save_webp(Path(args.input), Path(args.output), args.max_width, args.quality)


if __name__ == "__main__":
    main()
