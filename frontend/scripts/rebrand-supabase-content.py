import json
import os
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = ROOT / ".env.local"
OLD_TERMS = [
    "Little Treasures From China",
    "Little Treasures",
    "little-treasures-from-china",
    "littletreasuresfromchina",
    "little_treasures_from_china",
    "LTFC",
    "hello@auctuslab.com",
]
REPLACEMENTS = {
    "Little Treasures From China": "Auctus Heritage",
    "Little Treasures": "Auctus Heritage",
    "little-treasures-from-china": "auctus-heritage",
    "littletreasuresfromchina": "auctusheritage",
    "little_treasures_from_china": "auctus_heritage",
    "LTFC": "AH",
    "hello@auctuslab.com": "hello@auctusheritage.com",
}


def load_env() -> dict[str, str]:
    values = dict(os.environ)
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            values.setdefault(key.strip(), value.strip().strip('"').strip("'"))
    return values


def replace_value(value: Any) -> Any:
    if isinstance(value, str):
        for old, new in REPLACEMENTS.items():
            value = value.replace(old, new)
        return value
    if isinstance(value, list):
        return [replace_value(item) for item in value]
    if isinstance(value, dict):
        return {key: replace_value(item) for key, item in value.items()}
    return value


def has_old(value: Any) -> bool:
    text = json.dumps(value, ensure_ascii=False) if not isinstance(value, str) else value
    lower = text.lower()
    return any(term.lower() in lower for term in OLD_TERMS)


def request(method: str, path: str, key: str, body: Any | None = None) -> Any:
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        path,
        data=data,
        method=method,
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation,resolution=merge-duplicates",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        payload = response.read().decode("utf-8")
        return json.loads(payload) if payload else None


def main() -> None:
    env = load_env()
    url = env.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        raise SystemExit("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.")

    report: dict[str, Any] = {"site_settings": 0, "stories": 0, "products": 0}

    settings = request("GET", f"{url}/rest/v1/site_settings?select=key,value", key) or []
    for row in settings:
        if has_old(row.get("value")):
            request(
                "PATCH",
                f"{url}/rest/v1/site_settings?key=eq.{urllib.parse.quote(row['key'])}",
                key,
                {"value": replace_value(row["value"])},
            )
            report["site_settings"] += 1

    request(
        "POST",
        f"{url}/rest/v1/site_settings?on_conflict=key",
        key,
        [
            {"key": "brand", "value": {"name": "Auctus Heritage", "email": "hello@auctusheritage.com"}},
            {
                "key": "domain",
                "value": {
                    "primary": "https://auctusheritage.com",
                    "contactEmail": "hello@auctusheritage.com",
                    "legalName": "Auctus Lab LLC",
                },
            },
        ],
    )

    text_columns = [
        "title",
        "title_zh",
        "excerpt",
        "excerpt_zh",
        "body",
        "body_zh",
    ]
    stories = request("GET", f"{url}/rest/v1/stories?select=id,{','.join(text_columns)}", key) or []
    for row in stories:
        patch = {column: replace_value(row.get(column)) for column in text_columns if has_old(row.get(column))}
        if patch:
            request("PATCH", f"{url}/rest/v1/stories?id=eq.{row['id']}", key, patch)
            report["stories"] += 1

    product_columns = ["brand", "seo_title", "seo_title_zh", "seo_description", "seo_description_zh"]
    products = request("GET", f"{url}/rest/v1/products?select=id,{','.join(product_columns)}", key) or []
    for row in products:
        patch = {column: replace_value(row.get(column)) for column in product_columns if has_old(row.get(column))}
        if row.get("brand") in {"Little Treasures From China", "Little Treasures", None, ""}:
            patch["brand"] = "Auctus Heritage"
        if patch:
            request("PATCH", f"{url}/rest/v1/products?id=eq.{row['id']}", key, patch)
            report["products"] += 1

    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
