import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_EXCEL = Path(
    r"C:\Users\alexd\xwechat_files\alexdhljl_f3fe\msg\file\2026-07\之间味道产品清单20260703（英）(3).xlsx"
)
OUTPUT_DIR = PROJECT_ROOT / "organized-products" / "supplier-import-20260703"


SCENES = [
    {
        "slug": "teacher-gifts",
        "name": "Teacher Gifts",
        "name_zh": "教师礼物",
        "description": "Thoughtful stationery, notebooks, and small cultural objects for teachers and mentors.",
    },
    {
        "slug": "student-gifts",
        "name": "Student Gifts",
        "name_zh": "学生礼物",
        "description": "Useful, playful cultural stationery for school, study, and everyday writing.",
    },
    {
        "slug": "gifts-for-kids",
        "name": "Gifts for Kids",
        "name_zh": "送给孩子",
        "description": "Fun, educational, and character-driven gifts for young learners.",
    },
    {
        "slug": "birthday-gifts",
        "name": "Birthday Gifts",
        "name_zh": "生日礼物",
        "description": "Colorful, collectible, and easy-to-give objects for memorable birthdays.",
    },
    {
        "slug": "travel-souvenirs",
        "name": "Travel Souvenirs",
        "name_zh": "旅行纪念",
        "description": "Compact keepsakes that carry a story of place, culture, and memory.",
    },
    {
        "slug": "housewarming-gifts",
        "name": "Housewarming Gifts",
        "name_zh": "乔迁礼物",
        "description": "Small home accents and decorative cultural keepsakes for a new home.",
    },
    {
        "slug": "desk-office-gifts",
        "name": "Desk & Office Gifts",
        "name_zh": "办公桌礼物",
        "description": "Refined pens, notebooks, and desktop objects for work and creative spaces.",
    },
    {
        "slug": "corporate-gifts",
        "name": "Corporate Gifts",
        "name_zh": "企业礼赠",
        "description": "Polished cultural gifts for clients, partners, teams, and institutional events.",
    },
    {
        "slug": "premium-gifts",
        "name": "Premium Gifts",
        "name_zh": "高端礼物",
        "description": "Higher-value cultural objects, notebooks, and jewelry for important occasions.",
    },
    {
        "slug": "collector-gifts",
        "name": "Collector Gifts",
        "name_zh": "收藏礼物",
        "description": "Distinctive cultural keepsakes and limited-feeling objects for collectors.",
    },
]


PRODUCT_NAMES: dict[str, tuple[str, str, str]] = {
    "1": ("jiangbei-chongqing-dragon-eraser-set", "Jiangbei Chongqing Dragon Eraser Set", "江北重庆龙橡皮套装"),
    "2": ("starry-universe-eraser-set", "Starry Universe Eraser Set", "星光宇宙橡皮套装"),
    "3": ("analong-dinosaur-eraser-set", "Analong Dinosaur Eraser Set", "阿纳龙恐龙橡皮套装"),
    "4": ("here-comes-wukong-eraser-set", "Here Comes Wukong Eraser Set", "悟空来了橡皮套装"),
    "5": ("carved-glazed-flower-eraser-set", "Carved Glazed Flower Eraser Set", "雕花琉璃构件橡皮套装"),
    "6": ("panda-expressions-eraser-set", "Panda Expressions Eraser Set", "熊猫表情橡皮套装"),
    "7": ("jade-faced-figure-eraser", "Jade-Faced Figure Eraser", "玉面人橡皮"),
    "8": ("panda-wobbling-pen", "Panda Wobbling Pen", "熊猫摇摇笔"),
    "9": ("jade-faced-figure-wobbling-pen", "Jade-Faced Figure Wobbling Pen", "玉面人摇摇笔"),
    "10": ("panda-signature-pen", "Panda Signature Pen", "熊猫签字笔"),
    "11": ("capital-museum-series-pen", "Capital Museum Series Pen", "首都博物馆系列签字笔"),
    "12": ("carved-glazed-flower-signature-pen", "Carved Glazed Flower Signature Pen", "雕花琉璃构件签字笔"),
    "13": ("plum-blossom-signature-pen", "Plum Blossom Signature Pen", "梅花签字笔"),
    "14": ("bamboo-signature-pen", "Bamboo Signature Pen", "竹子签字笔"),
    "15": ("weekly-journal-notebook", "Weekly Journal Notebook", "周计划笔记本"),
    "16": ("andean-condor-magnetic-notebook", "Andean Condor Magnetic Notebook", "安第斯神鹰磁吸笔记本"),
    "17": ("wukong-fridge-magnet", "Wukong Fridge Magnet", "悟空冰箱贴"),
    "18": ("deer-pattern-gold-earrings-magnet", "鹿纹金耳饰冰箱贴", "鹿纹金耳饰冰箱贴"),
    "19": ("maya-sun-god-fridge-magnet", "Maya Sun God Fridge Magnet", "玛雅太阳神冰箱贴"),
    "20": ("incense-burner-stand-magnet", "Incense Burner Stand Magnet", "香炉座冰箱贴"),
    "21": ("spider-hollow-out-magnet", "Spider Hollow-Out Magnet", "镂空蜘蛛冰箱贴"),
    "22": ("leopard-and-sun-god-pendant", "Leopard and Sun God Pendant", "美洲豹与太阳神挂件"),
    "23": ("leopard-plush-pendant", "Leopard Plush Pendant", "美洲豹毛绒挂件"),
    "25": ("maya-civilization-mystery-box", "Maya Civilization Mystery Box", "玛雅文明盲盒"),
    "26": ("mayan-jewelry-i", "Mayan Jewelry I", "玛雅首饰一"),
    "27": ("mayan-jewelry-ii", "Mayan Jewelry II", "玛雅首饰二"),
    "28": ("mayan-jewelry-iii", "Mayan Jewelry III", "玛雅首饰三"),
    "29": ("mayan-jewelry-iv", "Mayan Jewelry IV", "玛雅首饰四"),
}


ZH_LONG: dict[str, str] = {
    "jiangbei-chongqing-dragon-eraser-set": "这款文创橡皮以江北重庆龙的卡通形象为原型，保留了恐龙背部骨板等代表性特征，并采用清新、童趣的配色。柔软易用的橡皮材质让它适合日常书写擦除，也把重庆地方古生物文化融入学生文具之中，兼具实用性、科普意义和小型收藏价值。",
    "starry-universe-eraser-set": "这款橡皮以宇航员和星空探索为主题，包装上带有“Conquer Space, We Can Do It!”的文字和星点图案。它既是顺滑好用的学习文具，也承载了探索宇宙的启发精神，适合作为学生文具、科普礼物和太空主题小收藏。",
    "analong-dinosaur-eraser-set": "这组三件装文创橡皮以云南地方古生物阿纳龙为灵感，呈现长颈蜥脚类恐龙的经典体态。产品在满足日常擦除需求的同时，把云南恐龙科普与实用文具结合起来，适合孩子、学生和喜欢自然历史的收藏者。",
    "here-comes-wukong-eraser-set": "这组橡皮以“悟空来了”的经典形象为灵感，重现孙悟空鲜明的角色特征。每盒三件，适合日常学习使用，也把《西游记》元素转化为轻松、年轻化的学生文具，兼具实用性和纪念价值。",
    "carved-glazed-flower-eraser-set": "这款橡皮以传统雕花琉璃建筑构件为造型来源，呈现交织花纹与半透明琉璃色彩的视觉特点。三件装设计适合日常使用，也把古建筑装饰之美转化为可触摸、可使用的文具小物。",
    "panda-expressions-eraser-set": "这款熊猫橡皮以经典黑白熊猫形象为灵感，三件装设计满足日常书写擦除需求。柔软材质擦除干净、不易伤纸，把温暖可爱的熊猫形象融入学习文具，适合作为儿童礼物、学生文具和轻松的小收藏。",
    "jade-faced-figure-eraser": "这款橡皮以古代玉面具类文物为灵感，呈现简洁的玉器轮廓和装饰纹样。柔软易擦的材质让它适合日常使用，也让古代玉器审美以亲切、可负担的方式进入学生文具和文化纪念品。",
    "panda-wobbling-pen": "这款摇摇笔结合熊猫与蜜蜂两个可爱元素，笔头为熊猫脸和蜂纹圆球，摇动时带来轻松有趣的减压体验。暖黄色笔杆让整体视觉柔和统一，是兼具书写、玩趣和熊猫主题收藏感的小礼物。",
    "jade-faced-figure-wobbling-pen": "这款摇摇笔以古代玉面具文物为造型灵感，笔头再现玉面具的简洁轮廓与传统纹样。摇动结构增加了趣味和减压感，让古代玉器审美与日常书写工具自然结合。",
    "panda-signature-pen": "这款中性笔以经典黑白熊猫为中心，搭配明亮红色笔杆和中式花饰。黑白熊猫与红色背景形成鲜明对比，传统花朵元素增添节庆气息，是兼具顺滑书写和可爱外观的日常文具。",
    "capital-museum-series-pen": "这款签字笔以首都博物馆馆藏文物为灵感，提取青铜鼎、兽面尊等经典元素装饰笔夹，并搭配复古色系笔杆。它把博物馆文物的审美转化为日常书写工具，让使用者在办公和学习中接近馆藏文化。",
    "carved-glazed-flower-signature-pen": "这款中性笔以西式雕花琉璃构件为灵感，呈现复古雕花线条与半透明质感，并搭配柔和的复古笔杆色彩。顺滑书写之外，它也具有装饰性和收藏感。",
    "plum-blossom-signature-pen": "这款签字笔以中式梅花纹样为主题，呈现梅枝与花朵的雅致线条，并搭配清新的笔杆色彩。梅花象征坚韧与清雅，让这款笔适合日常办公、书写和中式审美礼赠。",
    "bamboo-signature-pen": "这款签字笔以青竹为纹样灵感，呈现竹节纹理和竹叶图案，柔和绿色笔杆呼应竹子的自然质感。它把竹子的坚韧寓意融入日常书写，适合办公桌、教师礼物和文化小礼品。",
    "weekly-journal-notebook": "这款周计划笔记本的图案源自玛雅晚期经典时期彩绘浮雕陶器 K6547。原文物记录了王室仪式与宇宙神话，图像中的世界树连接三界，巴卡布神支撑大地，展现出玛雅文明丰富的宇宙观与艺术智慧。",
    "andean-condor-magnetic-notebook": "这款安第斯神鹰磁吸笔记本采用特种纸、UV 与烫金工艺，并配有锌合金与绿松石质感的神鹰磁吸装饰。安第斯神鹰象征高山与天空，整体设计把文化图像、精致工艺和实用书写结合在一起。",
    "wukong-fridge-magnet": "这款悟空冰箱贴以孙悟空形象为灵感，将经典文学角色转化为可摆放、可吸附的日常纪念小物。它适合作为旅行纪念、孩子礼物和中国故事主题收藏。",
    "deer-pattern-gold-earrings-magnet": "这款鹿纹金耳饰冰箱贴以玛雅相关装饰形象为灵感，采用浮雕、白底烤漆和多轴转动结构，呈现富有层次的视觉效果。它把古代文明图像转化为家居空间中的小型文化装饰。",
    "maya-sun-god-fridge-magnet": "这款玛雅太阳神冰箱贴以太阳神相关图像为灵感，使用锌合金材质呈现鲜明的文化纹样。它适合作为冰箱贴、旅行纪念和古文明主题收藏。",
    "incense-burner-stand-magnet": "这款香炉座冰箱贴以古代器物和陈设形态为灵感，采用树脂材质呈现立体造型。它适合放在家中或办公空间，作为兼具装饰性和文化故事的小型纪念品。",
    "spider-hollow-out-magnet": "这款镂空蜘蛛冰箱贴采用仿珐琅、珠光漆和镶嵌工艺，呈现类似首饰珠饰的细腻层次。它适合喜欢独特图案、古文明主题和收藏型小物的用户。",
    "leopard-and-sun-god-pendant": "这款挂件以美洲豹和太阳神为主题，采用锌合金材质，把古代文明中的动物与神祇意象转化为随身携带的纪念小物。",
    "leopard-plush-pendant": "这款美洲豹毛绒挂件采用毛绒、金属环、挂绳和机芯，并结合刺绣与贴布绣工艺。柔软可爱的造型让古文明中的美洲豹形象变得亲切，适合孩子、生日和旅行纪念。",
    "maya-civilization-mystery-box": "这款玛雅文明盲盒以考古和古文明探索为主题，尺寸小巧，适合收藏和赠送。它把未知感、角色造型和文化故事结合起来，适合作为轻松有趣的文化礼物。",
    "mayan-jewelry-i": "这款玛雅主题首饰采用全金色镀铜吊坠，搭配优化菱镁绿松石、镀银铜、红玛瑙和手工编绳。整体以玛雅文明图像为灵感，适合作为更精致的文化配饰礼物。",
    "mayan-jewelry-ii": "这款玛雅主题首饰采用全金色镀铜吊坠，搭配优化菱镁绿松石、镀银铜、红玛瑙和手工编绳，呈现带有古文明气质的配饰风格。",
    "mayan-jewelry-iii": "这款玛雅主题首饰采用全金色镀铜吊坠，并搭配青金石珠饰。深蓝色青金石与金色吊坠形成鲜明对比，适合作为高端文化配饰和收藏礼物。",
    "mayan-jewelry-iv": "这款玛雅主题首饰采用全金色镀铜吊坠，并搭配青金石珠饰，整体更具礼赠和收藏属性。由于当前缺少产品图片，建议补图后再正式前台展示。",
}


def load_env() -> dict[str, str]:
    values: dict[str, str] = {}
    for line in (FRONTEND_ROOT / ".env.local").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            values[key] = value.strip().strip("\"'")
    return values


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return re.sub(r"^-+|-+$", "", value)


def first_sentence(value: str) -> str:
    cleaned = re.sub(r"\s+", " ", value).strip()
    return re.split(r"(?<=[.!?])\s+", cleaned)[0][:240]


def parse_price(value: Any) -> float | None:
    match = re.search(r"\d+(?:\.\d+)?", "" if value is None else str(value))
    return float(match.group(0)) if match else None


def env_headers(env: dict[str, str]) -> dict[str, str]:
    key = env["SUPABASE_SERVICE_ROLE_KEY"]
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=representation",
    }


def request_json(env: dict[str, str], method: str, endpoint: str, payload: Any | None = None) -> Any:
    body = None if payload is None else json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/") + endpoint,
        data=body,
        method=method,
        headers=env_headers(env),
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        raw = response.read().decode("utf-8")
        return json.loads(raw) if raw else []


def fetch_products(env: dict[str, str]) -> list[dict[str, Any]]:
    endpoint = (
        "/rest/v1/products?select=id,slug,product_name_en,product_name_zh,english_name,name,"
        "category,subcategory,collection,museum,price,status,featured,images,cover_image,gallery_images,"
        "occasion_tags,gift_recommendations,recipient_tags,target_audience,materials,dimensions"
    )
    return request_json(env, "GET", endpoint)


def extract_supplier_rows(path: Path) -> list[dict[str, Any]]:
    df = pd.read_excel(path, sheet_name="文创产品", header=1, dtype=str).dropna(how="all")
    rows: list[dict[str, Any]] = []
    for _, row in df.iterrows():
        values = list(row.fillna("").values)
        supplier_no = str(values[0]).strip()
        if supplier_no not in PRODUCT_NAMES:
            continue
        slug, name_en, name_zh = PRODUCT_NAMES[supplier_no]
        rows.append({
            "supplier_no": supplier_no,
            "slug": slug,
            "product_name_en": name_en,
            "product_name_zh": name_zh,
            "category_raw": str(values[2]).strip().lower(),
            "price": parse_price(values[5]),
            "specifications": str(values[6]).strip(),
            "design_concept": str(values[7]).strip(),
        })
    return rows


def split_specs(specifications: str) -> tuple[str, str]:
    lines = [line.strip() for line in specifications.splitlines() if line.strip()]
    materials: list[str] = []
    dimensions: list[str] = []
    for line in lines:
        lower = line.lower()
        if re.search(r"\d", line) and any(unit in lower for unit in ["mm", "cm", "*", "~", "size", "±"]):
            dimensions.append(line)
        elif "craft" not in lower:
            materials.append(re.sub(r"^materials?:\s*", "", line, flags=re.I))
    return ("; ".join(materials) or specifications, "; ".join(dimensions) or "TBD")


def supplier_scenes(slug: str, raw_category: str, price: float | None) -> list[str]:
    if raw_category == "eraser":
        if "jade-faced" in slug:
            return ["Student Gifts", "Collector Gifts"]
        if "wukong" in slug:
            return ["Gifts for Kids", "Birthday Gifts"]
        return ["Gifts for Kids", "Student Gifts"]
    if raw_category == "shaking pen":
        return ["Gifts for Kids", "Student Gifts"]
    if raw_category == "sign pen":
        if slug in {"bamboo-signature-pen", "plum-blossom-signature-pen", "capital-museum-series-pen"}:
            return ["Teacher Gifts", "Desk & Office Gifts", "Corporate Gifts"]
        return ["Teacher Gifts", "Student Gifts", "Desk & Office Gifts"]
    if raw_category == "book":
        return ["Teacher Gifts", "Desk & Office Gifts", "Corporate Gifts"] if (price or 0) < 20 else ["Corporate Gifts", "Premium Gifts", "Desk & Office Gifts"]
    if raw_category == "refrigerator magnet":
        if "spider" in slug:
            return ["Collector Gifts", "Housewarming Gifts"]
        return ["Travel Souvenirs", "Housewarming Gifts"]
    if raw_category == "toy":
        if "plush" in slug:
            return ["Gifts for Kids", "Birthday Gifts", "Travel Souvenirs"]
        if "mystery-box" in slug:
            return ["Gifts for Kids", "Birthday Gifts", "Collector Gifts"]
        return ["Birthday Gifts", "Travel Souvenirs"]
    if raw_category == "jewelry":
        return ["Premium Gifts", "Collector Gifts", "Corporate Gifts"]
    return []


def infer_general_scenes(product: dict[str, Any]) -> list[str]:
    text = " ".join(str(product.get(key) or "") for key in ["slug", "product_name_en", "category", "subcategory", "collection"]).lower()
    price = product.get("price")
    scenes: list[str] = []
    if any(word in text for word in ["notebook", "pen", "bookmark", "stationery", "desk", "stapler"]):
        scenes.extend(["Teacher Gifts", "Desk & Office Gifts"])
    if any(word in text for word in ["eraser", "panda", "wobbling", "plush", "toy", "kids", "dinosaur", "wukong"]):
        scenes.append("Gifts for Kids")
    if any(word in text for word in ["magnet", "ornament", "cup", "home", "pouch"]):
        scenes.append("Housewarming Gifts")
    if any(word in text for word in ["magnet", "bookmark", "ornament", "keychain", "souvenir"]):
        scenes.append("Travel Souvenirs")
    if any(word in text for word in ["jewelry", "pendant", "bracelet", "gift box", "collectible", "mystery"]):
        scenes.append("Collector Gifts")
    if any(word in text for word in ["jewelry", "premium", "notebook"]) or (isinstance(price, (int, float)) and price >= 50):
        scenes.append("Premium Gifts")
    if any(word in text for word in ["notebook", "pen", "gift box"]) or (isinstance(price, (int, float)) and price >= 50):
        scenes.append("Corporate Gifts")
    if any(word in text for word in ["plush", "jewelry", "mystery", "ornament"]):
        scenes.append("Birthday Gifts")
    clean: list[str] = []
    for scene in scenes:
        if scene not in clean:
            clean.append(scene)
    return clean[:3]


def build_supplier_update(row: dict[str, Any]) -> dict[str, Any]:
    materials, dimensions = split_specs(row["specifications"])
    concept = row["design_concept"]
    slug = row["slug"]
    scenes = supplier_scenes(slug, row["category_raw"], row["price"])
    zh = ZH_LONG[slug]
    return {
        "product_name_en": row["product_name_en"],
        "product_name_zh": row["product_name_zh"],
        "name": row["product_name_zh"],
        "english_name": row["product_name_en"],
        "price": row["price"],
        "estimated_retail_price_min": row["price"],
        "estimated_retail_price_max": row["price"],
        "short_description": first_sentence(concept),
        "short_description_en": first_sentence(concept),
        "short_description_zh": zh.split("。")[0] + "。",
        "long_description_en": concept,
        "long_description_zh": zh,
        "story": concept,
        "story_en": concept,
        "story_zh": zh,
        "seo_description": first_sentence(concept)[:160],
        "seo_description_en": first_sentence(concept)[:160],
        "seo_description_zh": (zh.split("。")[0] + "。")[:160],
        "materials": materials,
        "dimensions": dimensions,
        "occasion_tags": scenes,
        "gift_recommendations": scenes,
        "target_audience": [],
        "recipient_tags": [],
        "image_alt_en": row["product_name_en"],
        "image_alt_zh": row["product_name_zh"],
        "alt_text": row["product_name_en"],
        "needs_review": slug == "mayan-jewelry-iv",
        "translation_checked": True,
    }


def scene_cover(products: list[dict[str, Any]], scene: str) -> str | None:
    candidates = [item for item in products if scene in (item.get("occasion_tags") or []) and item.get("images")]
    priority = {
        "Teacher Gifts": ["capital-museum-series-pen", "weekly-journal-notebook"],
        "Student Gifts": ["starry-universe-eraser-set", "panda-signature-pen"],
        "Gifts for Kids": ["panda-wobbling-pen", "panda-expressions-eraser-set"],
        "Birthday Gifts": ["maya-civilization-mystery-box", "leopard-plush-pendant"],
        "Travel Souvenirs": ["wukong-fridge-magnet", "maya-sun-god-fridge-magnet"],
        "Housewarming Gifts": ["deer-pattern-gold-earrings-magnet", "incense-burner-stand-magnet"],
        "Desk & Office Gifts": ["bamboo-signature-pen", "andean-condor-magnetic-notebook"],
        "Corporate Gifts": ["andean-condor-magnetic-notebook", "weekly-journal-notebook"],
        "Premium Gifts": ["mayan-jewelry-iii", "andean-condor-magnetic-notebook"],
        "Collector Gifts": ["spider-hollow-out-magnet", "maya-civilization-mystery-box"],
    }
    by_slug = {item["slug"]: item for item in candidates}
    for slug in priority.get(scene, []):
        if slug in by_slug:
            return by_slug[slug]["images"][0]
    return candidates[0]["images"][0] if candidates else None


def main() -> None:
    excel = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_EXCEL
    env = load_env()
    supplier_rows = extract_supplier_rows(excel)
    products = fetch_products(env)
    products_by_slug = {item["slug"]: item for item in products}
    report: dict[str, Any] = {"supplier_updates": [], "general_scene_updates": [], "scene_counts": {}}

    for row in supplier_rows:
        if row["slug"] not in products_by_slug:
            report["supplier_updates"].append({"slug": row["slug"], "status": "missing_in_database"})
            continue
        update = build_supplier_update(row)
        request_json(env, "PATCH", f"/rest/v1/products?slug=eq.{urllib.parse.quote(row['slug'])}", update)
        products_by_slug[row["slug"]].update(update)
        report["supplier_updates"].append({
            "slug": row["slug"],
            "price": row["price"],
            "scenes": update["occasion_tags"],
            "description_source": "xlsx Design Concept",
        })

    for product in products:
        slug = product["slug"]
        if slug in {row["slug"] for row in supplier_rows}:
            continue
        scenes = infer_general_scenes(product)
        if scenes != (product.get("occasion_tags") or []):
            request_json(env, "PATCH", f"/rest/v1/products?slug=eq.{urllib.parse.quote(slug)}", {
                "occasion_tags": scenes,
                "gift_recommendations": scenes,
            })
            products_by_slug[slug]["occasion_tags"] = scenes
            report["general_scene_updates"].append({"slug": slug, "scenes": scenes})

    for scene in SCENES:
        count = sum(1 for item in products_by_slug.values() if item.get("status") in ("active", "published") and scene["name"] in (item.get("occasion_tags") or []))
        report["scene_counts"][scene["name"]] = count

    category_rows = []
    for index, scene in enumerate(SCENES):
        category_rows.append({
            "slug": scene["slug"],
            "name": scene["name"],
            "name_zh": scene["name_zh"],
            "kind": "occasion",
            "description": scene["description"],
            "image": scene_cover(list(products_by_slug.values()), scene["name"]),
            "featured": report["scene_counts"][scene["name"]] > 0,
            "sort_order": index + 1,
        })
    request_json(env, "POST", "/rest/v1/categories?on_conflict=slug", category_rows)

    old_scene_slugs = ["housewarming", "for-kids", "birthday", "colleague-gifts", "host-gifts", "sports-gifts"]
    for slug in old_scene_slugs:
        request_json(env, "PATCH", f"/rest/v1/categories?slug=eq.{urllib.parse.quote(slug)}", {"featured": False})

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUTPUT_DIR / "scene-description-refinement-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps({
        "supplier_products_updated": len(report["supplier_updates"]),
        "general_products_scene_recalibrated": len(report["general_scene_updates"]),
        "scene_counts": report["scene_counts"],
        "report": str(OUTPUT_DIR / "scene-description-refinement-report.json"),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
