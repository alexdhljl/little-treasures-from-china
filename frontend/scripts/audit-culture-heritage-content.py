import csv
import json
import os
import re
import urllib.request
from datetime import date
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
FRONTEND = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "organized-products" / "culture-heritage-audit"


CLEAR_SIGNALS = [
    "sanxingdui",
    "dunhuang",
    "palace museum",
    "forbidden city",
    "maya",
    "aztec",
    "kinich",
    "k'inich",
    "wukong",
    "sun wukong",
    "plum blossom",
    "bronze",
    "jade mask",
    "chinese character",
]

GENERIC_SIGNALS = [
    "panda",
    "tennis",
    "astronaut",
    "stapler",
    "eraser",
    "pen",
    "magnet",
    "keychain",
    "notebook",
]


def load_env() -> dict[str, str]:
    values = dict(os.environ)
    env_file = FRONTEND / ".env.local"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            values.setdefault(key.strip(), value.strip().strip('"').strip("'"))
    return values


def get_json(url: str, key: str) -> Any:
    req = urllib.request.Request(url, headers={"apikey": key, "Authorization": f"Bearer {key}"})
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def text_blob(row: dict[str, Any]) -> str:
    fields = [
        "slug",
        "name",
        "english_name",
        "product_name_en",
        "product_name_zh",
        "museum",
        "collection",
        "official_collection",
        "series",
        "short_description",
        "long_description_en",
        "story_en",
        "tags",
    ]
    return " ".join(str(row.get(field) or "") for field in fields).lower()


def classify(row: dict[str, Any]) -> dict[str, str]:
    blob = text_blob(row)
    signals = [signal for signal in CLEAR_SIGNALS if signal in blob]
    generic = [signal for signal in GENERIC_SIGNALS if signal in blob]
    verified = "culture_heritage_verified" in blob
    if verified:
        return {
            "category": "A",
            "confidence": "High",
            "safe_to_publish": "yes",
            "reason": "Internal verified marker is present. Confirm source record before publishing if absent.",
            "proposed_cultural_topic": ", ".join(signals) or "Verified cultural topic",
        }
    if signals:
        return {
            "category": "B",
            "confidence": "Medium",
            "safe_to_publish": "no",
            "reason": "Named cultural signal exists, but no authoritative source has been attached in this audit.",
            "proposed_cultural_topic": ", ".join(signals),
        }
    if generic:
        return {
            "category": "C",
            "confidence": "Low",
            "safe_to_publish": "no",
            "reason": "Commercial or generic product type; do not infer cultural source from appearance.",
            "proposed_cultural_topic": "",
        }
    return {
        "category": "D",
        "confidence": "Low",
        "safe_to_publish": "no",
        "reason": "No clear cultural source signal found; manual review required before any Culture & Heritage content.",
        "proposed_cultural_topic": "",
    }


def main() -> None:
    env = load_env()
    url = env.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        raise SystemExit("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.")

    select = ",".join(
        [
            "id",
            "slug",
            "name",
            "english_name",
            "product_name_en",
            "product_name_zh",
            "museum",
            "collection",
            "official_collection",
            "series",
            "category",
            "tags",
            "short_description",
            "long_description_en",
            "story_en",
            "status",
        ]
    )
    products = get_json(f"{url}/rest/v1/products?select={select}&order=created_at.desc", key)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    today = date.today().isoformat()
    rows = []
    for product in products:
        result = classify(product)
        rows.append(
            {
                "product_id": product.get("id", ""),
                "product_slug": product.get("slug", ""),
                "product_name": product.get("product_name_en") or product.get("english_name") or product.get("name") or "",
                "proposed_cultural_topic": result["proposed_cultural_topic"],
                "likely_source": "",
                "confidence": result["confidence"],
                "classification": result["category"],
                "safe_to_publish": result["safe_to_publish"],
                "reason": result["reason"],
                "approved_for_publish": "false",
                "source_title": "",
                "source_organization": "",
                "source_url": "",
                "access_date": today,
                "research_notes": "Dry-run classification only. No historical claim is published from this report.",
            }
        )

    summary = {
        "products_audited": len(rows),
        "high_confidence": sum(row["confidence"] == "High" for row in rows),
        "medium_confidence": sum(row["confidence"] == "Medium" for row in rows),
        "low_confidence": sum(row["confidence"] == "Low" for row in rows),
        "culture_heritage_hidden": sum(row["safe_to_publish"] != "yes" for row in rows),
        "sources_used": [],
        "note": "This is a dry-run audit. Culture & Heritage should remain hidden unless approved_for_publish is true and authoritative sources are recorded.",
    }
    report = {"summary": summary, "products": rows}
    (OUTPUT_DIR / f"culture-heritage-audit-{today}.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    with (OUTPUT_DIR / f"culture-heritage-audit-{today}.csv").open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()) if rows else [])
        writer.writeheader()
        writer.writerows(rows)
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
