"""Deterministic, offline identity keys. No DNS, search or inferred contacts."""
import re
import unicodedata
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


def normalized_text(value: str | None) -> str:
    text = unicodedata.normalize("NFKC", value or "").casefold().strip()
    text = text.replace("&", " and ").replace("’", "").replace("'", "").replace(".", "")
    return " ".join("".join(c if c.isalnum() else " " for c in text).split())


def normalized_website(value: str | None) -> str | None:
    if not value or not value.strip():
        return None
    value = value.strip()
    parsed = urlsplit(value if "://" in value else "https://" + value)
    if parsed.scheme.lower() not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("Website must be a public HTTP(S) URL without credentials")
    host = parsed.hostname.lower().rstrip(".").encode("idna").decode("ascii")
    if host.startswith("www."):
        host = host[4:]
    if "." not in host or re.fullmatch(r"[0-9.]+", host) or ":" in host or host.endswith((".local", ".localhost")):
        raise ValueError("Website must use a public domain name")
    if not re.fullmatch(r"[a-z0-9.-]+", host):
        raise ValueError("Invalid domain")
    port = parsed.port
    authority = host + (f":{port}" if port and port not in {80, 443} else "")
    path = re.sub(r"/{2,}", "/", parsed.path).rstrip("/")
    if path.lower() in {"/index.html", "/index.htm"}:
        path = ""
    query = sorted((k, v) for k, v in parse_qsl(parsed.query, keep_blank_values=True)
                   if not k.lower().startswith("utm_") and k.lower() not in {"gclid", "fbclid"})
    return urlunsplit(("https", authority, path, urlencode(query), ""))


def normalized_domain(website: str | None) -> str | None:
    normalized = normalized_website(website)
    return urlsplit(normalized).hostname if normalized else None


def normalized_state(state: str | None) -> str:
    regions = {"new york": "ny", "new jersey": "nj", "connecticut": "ct"}
    region = normalized_text(state)
    return regions.get(region, region)


def normalized_country(country: str | None) -> str:
    nation = normalized_text(country)
    if nation in {"usa", "united states", "united states of america"}:
        nation = "us"
    return nation


def name_location_key(name: str | None, city: str | None, state: str | None, country: str | None) -> str | None:
    if not name or not (city or state):
        return None
    # Country is optional; compare conflicting known countries during merge.
    return "|".join([normalized_text(name), normalized_text(city), normalized_state(state)])
