import argparse
import csv
import mimetypes
import json
import os
import re
import shutil
import sys
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET

import pandas as pd
from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_ROOT = PROJECT_ROOT / "organized-products" / "supplier-import-20260703"
EXCEL_PATH = Path(
    r"C:\Users\alexd\xwechat_files\alexdhljl_f3fe\msg\file\2026-07\之间味道产品清单20260703（英）(3).xlsx"
)
BUCKET = "product-images"
SERVICE_HEADERS = {"Content-Type": "application/json", "Prefer": "return=representation"}


OCCASIONS = {
    "teacher": "Teacher Gifts",
    "housewarming": "Housewarming",
    "birthday": "Birthday Gifts",
    "kids": "For Kids",
    "travel": "Travel Souvenirs",
    "corporate": "Corporate Gifts",
}


@dataclass
class SupplierProduct:
    supplier_no: str
    category_zh: str
    category_raw: str
    source_name: str
    product_name_en: str
    product_name_zh: str
    slug: str
    price: float | None
    specifications: str
    design_concept: str
    category: str
    subcategory: str
    collection: str
    museum: str
    occasion_tags: list[str]
    target_audience: list[str]
    tags: list[str]
    image_refs: list[str]
    extracted_images: list[str]
    match_action: str
    match_slug: str
    match_score: float
    missing_fields: list[str]


def load_env() -> dict[str, str]:
    env_path = FRONTEND_ROOT / ".env.local"
    values: dict[str, str] = {}
    if not env_path.exists():
        return values
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key] = value.strip().strip("\"'")
    return values


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return re.sub(r"^-+|-+$", "", value)


def normalize(value: str) -> str:
    value = value.lower()
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def title_case(value: str) -> str:
    small = {"and", "of", "the", "with", "for"}
    parts = value.replace("-", " ").split()
    out = []
    for index, part in enumerate(parts):
        lower = part.lower()
        out.append(lower if index and lower in small else lower.capitalize())
    return " ".join(out)


def parse_price(value: Any) -> float | None:
    if value is None:
        return None
    match = re.search(r"\d+(?:\.\d+)?", str(value))
    return float(match.group(0)) if match else None


def product_name(row: dict[str, Any]) -> tuple[str, str]:
    raw = str(row["Product Name"]).strip()
    concept = str(row["Design Concept"]).lower()
    no = str(row["序号"]).strip()
    names: dict[str, tuple[str, str]] = {
        "1": ("Jiangbei Chongqing Dragon Eraser Set", "江北重庆龙橡皮套装"),
        "2": ("Starry Universe Eraser Set", "星光宇宙橡皮套装"),
        "3": ("Analong Dinosaur Eraser Set", "阿纳龙恐龙橡皮套装"),
        "4": ("Here Comes Wukong Eraser Set", "悟空来了橡皮套装"),
        "5": ("Carved Glazed Flower Eraser Set", "雕花琉璃构件橡皮套装"),
        "6": ("Panda Expressions Eraser Set", "熊猫表情橡皮套装"),
        "7": ("Jade-Faced Figure Eraser", "玉面人橡皮"),
        "8": ("Panda Wobbling Pen", "熊猫摇摇笔"),
        "9": ("Jade-Faced Figure Wobbling Pen", "玉面人摇摇笔"),
        "10": ("Panda Signature Pen", "熊猫签字笔"),
        "11": ("Capital Museum Series Pen", "首都博物馆系列签字笔"),
        "12": ("Carved Glazed Flower Signature Pen", "雕花琉璃构件签字笔"),
        "13": ("Plum Blossom Signature Pen", "梅花签字笔"),
        "14": ("Bamboo Signature Pen", "竹子签字笔"),
        "15": ("Weekly Journal Notebook", "周计划笔记本"),
        "16": ("Andean Condor Magnetic Notebook", "安第斯神鹰磁吸笔记本"),
        "17": ("Wukong Fridge Magnet", "悟空冰箱贴"),
        "18": ("Deer Pattern Gold Earrings Magnet", "鹿纹金耳饰冰箱贴"),
        "19": ("Maya Sun God Fridge Magnet", "玛雅太阳神冰箱贴"),
        "20": ("Incense Burner Stand Magnet", "香炉座冰箱贴"),
        "21": ("Spider Hollow-Out Magnet", "镂空蜘蛛冰箱贴"),
        "22": ("Leopard and Sun God Pendant", "美洲豹与太阳神挂件"),
        "23": ("Leopard Plush Pendant", "美洲豹毛绒挂件"),
        "25": ("Maya Civilization Mystery Box", "玛雅文明盲盒"),
        "26": ("Mayan Jewelry I", "玛雅首饰一"),
        "27": ("Mayan Jewelry II", "玛雅首饰二"),
        "28": ("Mayan Jewelry III", "玛雅首饰三"),
        "29": ("Mayan Jewelry IV", "玛雅首饰四"),
    }
    if no in names:
        return names[no]
    if raw.lower() == "dragon eraser" and "analong" in concept:
        return "Analong Dinosaur Eraser Set", "阿纳龙恐龙橡皮套装"
    if raw.lower() == "dragon eraser":
        return "Jiangbei Chongqing Dragon Eraser Set", "江北重庆龙橡皮套装"
    return title_case(raw), raw


def classify(category_raw: str, name_en: str, concept: str, price: float | None) -> tuple[str, str, str, str, list[str], list[str], list[str]]:
    raw = category_raw.lower()
    text = f"{name_en} {concept}".lower()
    category = "Cultural Gifts"
    subcategory = title_case(raw)
    collection = "Curated Selection"
    museum = "Curated Selection"
    occasions: set[str] = {OCCASIONS["travel"]}
    audience: set[str] = set()
    tags: set[str] = {raw.replace(" ", "-"), "china-cultural-gift"}

    if "maya" in text or "andean" in text or "leopard" in text or "sun god" in text or "spider" in text:
        collection = "Maya Cultural Gifts"
        tags.add("maya")
    if "panda" in text:
        collection = "Panda Gifts"
        tags.add("panda")
    if "wukong" in text:
        collection = "Chinese Heritage Collection"
        tags.update(["wukong", "journey-to-the-west"])
    if "capital museum" in text:
        museum = "Capital Museum"
        collection = "Capital Museum Series"
    if "jade" in text:
        collection = "Chinese Heritage Collection"
        tags.add("jade")

    if raw in {"eraser", "shaking pen", "sign pen", "book"}:
        category = "Stationery & Office"
        occasions.update([OCCASIONS["teacher"], OCCASIONS["birthday"]])
        audience.update(["Students", "Teachers", "Kids"])
    if raw == "eraser":
        subcategory = "Erasers"
        occasions.add(OCCASIONS["kids"])
    elif raw == "shaking pen":
        subcategory = "Wobbling Pens"
        occasions.add(OCCASIONS["kids"])
    elif raw == "sign pen":
        subcategory = "Signature Pens"
    elif raw == "book":
        subcategory = "Notebooks"
        occasions.add(OCCASIONS["corporate"])
        audience.update(["Colleagues", "Corporate Gifts"])
    elif raw == "refrigerator magnet":
        category = "Home & Living"
        subcategory = "Magnets"
        occasions.update([OCCASIONS["housewarming"], OCCASIONS["travel"], OCCASIONS["birthday"]])
        audience.update(["Museum Visitors", "Friends", "Tourists"])
    elif raw in {"toy"}:
        category = "Kids & Family"
        subcategory = "Collectible Toys"
        occasions.update([OCCASIONS["kids"], OCCASIONS["birthday"]])
        audience.update(["Kids", "Collectors"])
    elif raw == "jewelry":
        category = "Wear & Accessories"
        subcategory = "Jewelry"
        occasions.update([OCCASIONS["birthday"], OCCASIONS["corporate"]])
        audience.update(["Adults", "Collectors"])
        tags.add("jewelry")

    if price and price >= 50:
        occasions.add(OCCASIONS["corporate"])
        tags.add("premium")

    return category, subcategory, collection, museum, sorted(occasions), sorted(audience), sorted(tags)


def extract_image_maps(xlsx_path: Path) -> tuple[dict[str, str], dict[int, list[str]]]:
    with zipfile.ZipFile(xlsx_path) as archive:
        id_to_target: dict[str, str] = {}
        row_to_targets: dict[int, list[str]] = {}

        if "xl/cellimages.xml" in archive.namelist():
            rel_root = ET.fromstring(archive.read("xl/_rels/cellimages.xml.rels"))
            rels = {
                rel.attrib["Id"]: "xl/" + rel.attrib["Target"]
                for rel in rel_root
            }
            root = ET.fromstring(archive.read("xl/cellimages.xml"))
            ns = {
                "xdr": "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing",
                "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
                "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
            }
            for pic in root.findall(".//xdr:pic", ns):
                c_nv = pic.find(".//xdr:cNvPr", ns)
                blip = pic.find(".//a:blip", ns)
                if c_nv is not None and blip is not None:
                    image_id = c_nv.attrib.get("name", "")
                    rel_id = blip.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed", "")
                    if image_id and rel_id in rels:
                        id_to_target[image_id] = rels[rel_id]

        if "xl/drawings/drawing1.xml" in archive.namelist():
            rel_root = ET.fromstring(archive.read("xl/drawings/_rels/drawing1.xml.rels"))
            rels = {}
            for rel in rel_root:
                target = rel.attrib["Target"].replace("../", "xl/")
                rels[rel.attrib["Id"]] = target
            root = ET.fromstring(archive.read("xl/drawings/drawing1.xml"))
            ns = {
                "xdr": "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing",
                "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
                "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
            }
            for anchor in root.findall(".//xdr:twoCellAnchor", ns):
                row_node = anchor.find("./xdr:from/xdr:row", ns)
                blip = anchor.find(".//a:blip", ns)
                if row_node is None or blip is None:
                    continue
                excel_row = int(row_node.text or "0") + 1
                rel_id = blip.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed", "")
                if rel_id in rels:
                    row_to_targets.setdefault(excel_row, []).append(rels[rel_id])

    return id_to_target, row_to_targets


def extract_images(xlsx_path: Path, products: list[SupplierProduct]) -> None:
    images_dir = OUTPUT_ROOT / "extracted-images"
    images_dir.mkdir(parents=True, exist_ok=True)
    id_to_target, row_to_targets = extract_image_maps(xlsx_path)
    with zipfile.ZipFile(xlsx_path) as archive:
        for product in products:
            targets: list[str] = []
            for image_ref in product.image_refs:
                if image_ref in id_to_target:
                    targets.append(id_to_target[image_ref])
            excel_row = int(float(product.supplier_no)) + 2 if product.supplier_no else 0
            targets.extend(row_to_targets.get(excel_row, []))
            seen: set[str] = set()
            for index, target in enumerate(targets):
                if target in seen or target not in archive.namelist():
                    continue
                seen.add(target)
                suffix = Path(target).suffix.lower() or ".png"
                out_dir = images_dir / product.slug
                out_dir.mkdir(parents=True, exist_ok=True)
                out_path = out_dir / f"{index + 1:02d}{suffix}"
                if not out_path.exists():
                    out_path.write_bytes(archive.read(target))
                product.extracted_images.append(str(out_path))


def fetch_existing_products(env: dict[str, str]) -> list[dict[str, Any]]:
    url = env.get("NEXT_PUBLIC_SUPABASE_URL")
    key = env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    if not url or not key:
        return []
    query = (
        "select=id,slug,product_name_en,product_name_zh,english_name,name,category,subcategory,"
        "collection,museum,price,estimated_retail_price_min,estimated_retail_price_max,"
        "occasion_tags,gift_recommendations,status,featured,images,cover_image,gallery_images,updated_at"
        "&order=created_at.desc"
    )
    request = urllib.request.Request(
        f"{url}/rest/v1/products?{query}",
        headers={"apikey": key, "Authorization": f"Bearer {key}"},
    )
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            data = json.loads(response.read().decode("utf-8"))
            return data if isinstance(data, list) else []
    except (urllib.error.URLError, urllib.error.HTTPError) as error:
        print(f"Warning: could not fetch Supabase products: {error}", file=sys.stderr)
        return []


def service_headers(env: dict[str, str], content_type: str = "application/json") -> dict[str, str]:
    key = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": content_type,
    }


def request_json(env: dict[str, str], method: str, path: str, payload: Any | None = None) -> Any:
    base = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = service_headers(env)
    headers["Prefer"] = "resolution=merge-duplicates,return=representation"
    request = urllib.request.Request(f"{base}{path}", data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=35) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else []
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {path} failed: {error.code} {detail}") from error


def optimize_to_webp(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        image = image.convert("RGB")
        width, height = image.size
        if width > 1600:
            next_height = round(height * (1600 / width))
            image = image.resize((1600, next_height), Image.Resampling.LANCZOS)
        image.save(destination, "WEBP", quality=88, method=6)


def upload_image(env: dict[str, str], source: Path, object_path: str) -> str:
    base = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
    content_type = mimetypes.guess_type(str(source))[0] or "image/webp"
    headers = service_headers(env, content_type)
    headers["x-upsert"] = "true"
    request = urllib.request.Request(
        f"{base}/storage/v1/object/{BUCKET}/{urllib.parse.quote(object_path, safe='/')}",
        data=source.read_bytes(),
        method="POST",
        headers=headers,
    )
    try:
        with urllib.request.urlopen(request, timeout=45):
            pass
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Image upload failed for {object_path}: {error.code} {detail}") from error
    return f"{base}/storage/v1/object/public/{BUCKET}/{object_path}"


def first_sentence(value: str, fallback: str) -> str:
    cleaned = re.sub(r"\s+", " ", value).strip()
    if not cleaned:
        return fallback
    pieces = re.split(r"(?<=[.!?])\s+", cleaned)
    return pieces[0][:240]


def split_specs(specifications: str) -> tuple[str, str]:
    lines = [line.strip() for line in specifications.splitlines() if line.strip()]
    dimensions = []
    materials = []
    for line in lines:
        lower = line.lower()
        if re.search(r"\d", line) and any(unit in lower for unit in ["mm", "cm", "*", "~", "size", "±"]):
            dimensions.append(line)
        elif "material" in lower:
            materials.append(re.sub(r"^materials?:\s*", "", line, flags=re.I))
        elif "craft" not in lower and "size" not in lower:
            materials.append(line)
    return ("; ".join(materials) or specifications, "; ".join(dimensions) or "TBD")


def zh_story(product: SupplierProduct) -> str:
    if "Panda" in product.product_name_en:
        return f"{product.product_name_zh}以熊猫形象为灵感，把可爱的中国文化符号转化为日常可用的小物，适合学习、办公和轻松送礼。"
    if "Maya" in product.product_name_en or "Mayan" in product.product_name_en:
        return f"{product.product_name_zh}来自玛雅文明主题灵感，以图案、色彩或造型表现古代文明的想象力，适合作为文化纪念和收藏礼物。"
    if "Wukong" in product.product_name_en:
        return f"{product.product_name_zh}以孙悟空形象为灵感，把经典文学角色转化为轻松有趣的文创礼品。"
    if "Dragon" in product.product_name_en or "Dinosaur" in product.product_name_en:
        return f"{product.product_name_zh}以古生物与地方文化为灵感，把科普故事做成适合孩子和学生使用的文具小礼物。"
    return f"{product.product_name_zh}将文化灵感转化为日常可用的小物，适合送礼、纪念和收藏。"


def db_row(product: SupplierProduct, image_urls: list[str], existing: dict[str, Any] | None = None) -> dict[str, Any]:
    material, dimensions = split_specs(product.specifications)
    status = "review" if "image" in product.missing_fields else "active"
    cover = image_urls[0] if image_urls else None
    gallery = image_urls[1:] if len(image_urls) > 1 else []
    existing_images = existing.get("images") if existing else None
    existing_cover = existing.get("cover_image") if existing else None
    if existing and (existing_cover or existing_images):
        cover = existing_cover or (existing_images or [None])[0]
        gallery = (existing_images or [])[1:]
        existing_gallery = existing.get("gallery_images") or []
        if existing_gallery:
            gallery = existing_gallery
        image_urls = [item for item in [cover, *gallery] if item]
    return {
        "slug": product.match_slug or product.slug,
        "name": product.product_name_zh,
        "english_name": product.product_name_en,
        "product_name_en": product.product_name_en,
        "product_name_zh": product.product_name_zh,
        "brand": "Auctus Heritage",
        "supplier": "Between Taste",
        "museum": product.museum,
        "collection": product.collection,
        "category": product.category,
        "subcategory": product.subcategory,
        "price": product.price,
        "estimated_retail_price_min": product.price,
        "estimated_retail_price_max": product.price,
        "currency": "USD",
        "short_description": first_sentence(product.design_concept, product.product_name_en),
        "short_description_en": first_sentence(product.design_concept, product.product_name_en),
        "short_description_zh": f"{product.product_name_zh}，适合日常使用、送礼和文化纪念。",
        "long_description_en": product.design_concept,
        "long_description_zh": zh_story(product),
        "story": product.design_concept,
        "story_en": product.design_concept,
        "story_zh": zh_story(product),
        "materials": material,
        "dimensions": dimensions,
        "moq": 1,
        "lead_time": "Confirmed with quote",
        "origin": "China",
        "images": image_urls if image_urls else (existing_images or [] if existing else []),
        "cover_image": cover,
        "gallery_images": gallery,
        "image_alt_en": product.product_name_en,
        "image_alt_zh": product.product_name_zh,
        "tags": product.tags,
        "occasion_tags": product.occasion_tags,
        "recipient_tags": product.target_audience,
        "target_audience": product.target_audience,
        "gift_recommendations": product.occasion_tags,
        "official_collection": product.collection,
        "inventory_status": "made_to_order",
        "status": existing.get("status") if existing and existing.get("status") else status,
        "featured": existing.get("featured") if existing and existing.get("featured") is not None else False,
        "shipping_note": "International shipping quoted separately.",
        "return_note": "Returns and exchanges are reviewed case by case before order confirmation.",
        "seo_title": product.product_name_en,
        "seo_title_en": product.product_name_en,
        "seo_title_zh": product.product_name_zh,
        "seo_description": first_sentence(product.design_concept, product.product_name_en)[:160],
        "seo_description_en": first_sentence(product.design_concept, product.product_name_en)[:160],
        "seo_description_zh": f"{product.product_name_zh}，来自 Auctus Heritage 的精选文化礼品。",
        "seo_keywords": product.tags,
        "alt_text": product.product_name_en,
        "needs_review": bool(product.missing_fields),
        "ai_generated": True,
        "translation_checked": False,
        "photo_checked": "image" not in product.missing_fields,
        "source_folder": str(EXCEL_PATH.name),
        "original_file_names": [Path(item).name for item in product.extracted_images],
        "countries_available": ["US"],
        "languages": ["en", "zh"],
        "ltps_version": "1.0",
    }


def publish_products(env: dict[str, str], products: list[SupplierProduct], existing: list[dict[str, Any]]) -> dict[str, Any]:
    existing_by_slug = {row.get("slug"): row for row in existing}
    optimized_root = OUTPUT_ROOT / "webp"
    results: list[dict[str, Any]] = []
    cover_by_occasion: dict[str, str] = {}
    for product in products:
        image_urls: list[str] = []
        if product.match_action == "update_existing":
            current = existing_by_slug.get(product.match_slug)
        else:
            current = None
        for index, image in enumerate(product.extracted_images):
            image_path = Path(image)
            optimized = optimized_root / product.slug / f"{index + 1:02d}.webp"
            optimize_to_webp(image_path, optimized)
            image_urls.append(upload_image(env, optimized, f"supplier-20260703/{product.slug}/{optimized.name}"))
        row = db_row(product, image_urls, current)
        if product.match_action == "update_existing" and product.match_slug:
            request_json(env, "PATCH", f"/rest/v1/products?slug=eq.{urllib.parse.quote(product.match_slug)}", row)
            action = "updated"
        else:
            request_json(env, "POST", "/rest/v1/products?on_conflict=slug", row)
            action = "inserted"
        cover = row.get("cover_image")
        if cover:
            for occasion in product.occasion_tags:
                cover_by_occasion.setdefault(occasion, str(cover))
        results.append({"slug": row["slug"], "action": action, "price": product.price, "status": row["status"], "image_count": len(image_urls)})
    publish_occasion_categories(env, cover_by_occasion)
    return {
        "results": results,
        "inserted": sum(1 for item in results if item["action"] == "inserted"),
        "updated": sum(1 for item in results if item["action"] == "updated"),
        "occasion_categories_updated": len(cover_by_occasion),
    }


def publish_occasion_categories(env: dict[str, str], cover_by_occasion: dict[str, str]) -> None:
    zh = {
        "Teacher Gifts": "教师礼物",
        "Housewarming": "乔迁礼物",
        "Birthday Gifts": "生日礼物",
        "For Kids": "送给孩子",
        "Travel Souvenirs": "旅行纪念",
        "Corporate Gifts": "企业礼赠",
    }
    descriptions = {
        "Teacher Gifts": "Useful cultural stationery and classroom-friendly gifts.",
        "Housewarming": "Warm cultural keepsakes for home, shelves, and everyday life.",
        "Birthday Gifts": "Small, memorable gifts with playful cultural stories.",
        "For Kids": "Friendly learning objects, stationery, and character gifts.",
        "Travel Souvenirs": "Portable keepsakes inspired by museums, cities, and stories.",
        "Corporate Gifts": "Polished giftable objects for teams, clients, and partners.",
    }
    order = ["Teacher Gifts", "Housewarming", "Birthday Gifts", "For Kids", "Travel Souvenirs", "Corporate Gifts"]
    rows = []
    for index, name in enumerate(order):
        rows.append({
            "slug": slugify(name),
            "name": name,
            "name_zh": zh[name],
            "kind": "occasion",
            "description": descriptions[name],
            "image": cover_by_occasion.get(name),
            "featured": True,
            "sort_order": index + 1,
        })
    request_json(env, "POST", "/rest/v1/categories?on_conflict=slug", rows)


def best_match(product: SupplierProduct, existing: list[dict[str, Any]]) -> tuple[str, str, float]:
    best_slug = ""
    best_score = 0.0
    haystack = normalize(f"{product.product_name_en} {product.product_name_zh} {product.category} {product.subcategory}")
    for row in existing:
        names = " ".join(str(row.get(key) or "") for key in ["slug", "product_name_en", "product_name_zh", "english_name", "name"])
        score = SequenceMatcher(None, haystack, normalize(names)).ratio()
        if normalize(product.product_name_en) and normalize(product.product_name_en) in normalize(names):
            score = max(score, 0.98)
        if product.slug == row.get("slug"):
            score = 1.0
        if score > best_score:
            best_score = score
            best_slug = str(row.get("slug") or "")
    if best_score >= 0.86:
        return "update_existing", best_slug, best_score
    if best_score >= 0.72:
        return "review_conflict", best_slug, best_score
    return "insert_new", "", best_score


def build_products(df: pd.DataFrame, existing: list[dict[str, Any]]) -> list[SupplierProduct]:
    products: list[SupplierProduct] = []
    used_slugs: dict[str, int] = {}
    for _, raw_row in df.iterrows():
        row = {str(k): ("" if pd.isna(v) else v) for k, v in raw_row.to_dict().items()}
        supplier_no = str(row["序号"]).strip()
        name_en, name_zh = product_name(row)
        slug = slugify(name_en)
        used_slugs[slug] = used_slugs.get(slug, 0) + 1
        if used_slugs[slug] > 1:
            slug = f"{slug}-{supplier_no}"
        price = parse_price(row["建议零售价\n（美元/个）"])
        category, subcategory, collection, museum, occasions, audience, tags = classify(
            str(row["Product Category"]),
            name_en,
            str(row["Design Concept"]),
            price,
        )
        image_refs = re.findall(r'ID_[A-Z0-9]+', str(row.get("图片", "")))
        product = SupplierProduct(
            supplier_no=supplier_no,
            category_zh=str(row["产品类别"]).strip(),
            category_raw=str(row["Product Category"]).strip(),
            source_name=str(row["Product Name"]).strip(),
            product_name_en=name_en,
            product_name_zh=name_zh,
            slug=slug,
            price=price,
            specifications=str(row["Specifications"]).strip(),
            design_concept=str(row["Design Concept"]).strip(),
            category=category,
            subcategory=subcategory,
            collection=collection,
            museum=museum,
            occasion_tags=occasions,
            target_audience=audience,
            tags=tags,
            image_refs=image_refs,
            extracted_images=[],
            match_action="",
            match_slug="",
            match_score=0,
            missing_fields=[],
        )
        action, match_slug, score = best_match(product, existing)
        product.match_action = action
        product.match_slug = match_slug
        product.match_score = score
        products.append(product)
    return products


def validate(products: list[SupplierProduct]) -> None:
    for product in products:
        missing: list[str] = []
        if product.price is None:
            missing.append("price")
        if not product.design_concept:
            missing.append("design_concept")
        if not product.specifications:
            missing.append("specifications")
        if not product.extracted_images:
            missing.append("image")
        product.missing_fields = missing


def write_outputs(products: list[SupplierProduct], existing_count: int) -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    records = []
    for product in products:
        records.append({
            "supplier_no": product.supplier_no,
            "source_product_name": product.source_name,
            "product_name_en": product.product_name_en,
            "product_name_zh": product.product_name_zh,
            "slug": product.slug,
            "supplier_price_usd": product.price,
            "category": product.category,
            "subcategory": product.subcategory,
            "museum": product.museum,
            "collection": product.collection,
            "occasion_tags": " | ".join(product.occasion_tags),
            "target_audience": " | ".join(product.target_audience),
            "image_count": len(product.extracted_images),
            "match_action": product.match_action,
            "matched_existing_slug": product.match_slug,
            "match_score": round(product.match_score, 3),
            "needs_manual_review": bool(product.missing_fields or product.match_action == "review_conflict"),
            "missing_fields": " | ".join(product.missing_fields),
            "specifications": product.specifications,
            "design_concept": product.design_concept,
        })
    summary = {
        "source_excel": str(EXCEL_PATH),
        "existing_products_checked": existing_count,
        "supplier_rows": len(products),
        "insert_new": sum(1 for product in products if product.match_action == "insert_new"),
        "update_existing": sum(1 for product in products if product.match_action == "update_existing"),
        "review_conflict": sum(1 for product in products if product.match_action == "review_conflict"),
        "missing_images": sum(1 for product in products if "image" in product.missing_fields),
        "hero_image_policy": "Do not change homepage hero image.",
        "records": records,
    }
    (OUTPUT_ROOT / "supplier-merge-preview.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    with (OUTPUT_ROOT / "supplier-merge-preview.csv").open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(records[0].keys()))
        writer.writeheader()
        writer.writerows(records)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default=str(EXCEL_PATH))
    parser.add_argument("--write", action="store_true", help="Reserved for the confirmed import step.")
    args = parser.parse_args()

    source = Path(args.source)
    if not source.exists():
        raise FileNotFoundError(source)

    env = load_env()
    existing = fetch_existing_products(env)
    df = pd.read_excel(source, sheet_name="文创产品", header=1, dtype=str).dropna(how="all")
    products = build_products(df, existing)
    if OUTPUT_ROOT.exists():
        shutil.rmtree(OUTPUT_ROOT)
    extract_images(source, products)
    validate(products)
    write_outputs(products, len(existing))

    print(json.dumps({
        "preview": str(OUTPUT_ROOT / "supplier-merge-preview.csv"),
        "json": str(OUTPUT_ROOT / "supplier-merge-preview.json"),
        "products": len(products),
        "existing_products_checked": len(existing),
        "insert_new": sum(1 for product in products if product.match_action == "insert_new"),
        "update_existing": sum(1 for product in products if product.match_action == "update_existing"),
        "review_conflict": sum(1 for product in products if product.match_action == "review_conflict"),
        "missing_images": sum(1 for product in products if "image" in product.missing_fields),
        "write_mode": args.write,
    }, ensure_ascii=False, indent=2))

    if args.write:
        result = publish_products(env, products, existing)
        (OUTPUT_ROOT / "supplier-merge-publish-result.json").write_text(
            json.dumps(result, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
