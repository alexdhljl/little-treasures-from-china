from __future__ import annotations

import asyncio
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable
from urllib.parse import urljoin, urlparse, urlunparse

import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, HttpUrl

try:
    from playwright.async_api import async_playwright
except ImportError:  # Allows tests/imports before Playwright is installed.
    async_playwright = None


router = APIRouter(prefix="/scraper", tags=["scraper"])


TARGET_PAGE_PATTERNS = {
    "gift_shop": re.compile(r"(gift[-_/ ]?shop|museum[-_/ ]?store|campus[-_/ ]?store|store)", re.I),
    "wholesale": re.compile(r"(wholesale|bulk|retail[-_/ ]?partner|distributor)", re.I),
    "vendor": re.compile(r"(vendor[-_/ ]?application|vendor|supplier|procurement)", re.I),
    "partnership": re.compile(r"(work[-_/ ]?with[-_/ ]?us|partner|partnership|corporate[-_/ ]?gift)", re.I),
    "events": re.compile(r"(event|conference|facility[-_/ ]?rental|private[-_/ ]?event)", re.I),
}

CONTACT_TITLE_PATTERNS = re.compile(
    r"(gift shop manager|museum store director|retail director|merchandise buyer|"
    r"visitor experience director|procurement|partnerships?|corporate gifts?|"
    r"employee experience|hr manager|events? director)",
    re.I,
)

EMAIL_PATTERN = re.compile(r"(?<![\w.+-])[\w.+-]+@[\w-]+(?:\.[\w-]+)+(?![\w.+-])", re.I)
PHONE_PATTERN = re.compile(
    r"(?:(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})(?:\s*(?:x|ext\.?)\s*\d{1,6})?",
    re.I,
)
SOCIAL_PATTERNS = {
    "linkedin": re.compile(r"https?://(?:www\.)?linkedin\.com/(?:company|in)/[^\s\"'<>]+", re.I),
    "instagram": re.compile(r"https?://(?:www\.)?instagram\.com/[^\s\"'<>]+", re.I),
    "facebook": re.compile(r"https?://(?:www\.)?facebook\.com/[^\s\"'<>]+", re.I),
}


class CrawlRequest(BaseModel):
    homepage_url: HttpUrl
    max_depth: int = Field(default=2, ge=0, le=3)
    max_pages: int = Field(default=35, ge=1, le=150)
    use_browser: bool = False


class TargetPage(BaseModel):
    url: str
    page_type: str
    confidence: float
    title: str | None = None


class ExtractedContact(BaseModel):
    email: str | None = None
    phone: str | None = None
    linkedin_url: str | None = None
    title_hint: str | None = None
    source_url: str
    confidence: float


class SocialLinks(BaseModel):
    linkedin: list[str] = Field(default_factory=list)
    instagram: list[str] = Field(default_factory=list)
    facebook: list[str] = Field(default_factory=list)


class EnrichmentResult(BaseModel):
    provider: str
    status: str
    contacts: list[ExtractedContact] = Field(default_factory=list)
    notes: str | None = None


class CrawlResult(BaseModel):
    institution_homepage: str
    domain: str
    crawled_pages: int
    target_pages: list[TargetPage]
    contacts: list[ExtractedContact]
    social_links: SocialLinks
    enrichment: EnrichmentResult
    ready_for_insert: dict
    scraped_at: datetime


@dataclass(frozen=True)
class PageFetch:
    url: str
    status_code: int
    html: str


def canonicalize_url(raw_url: str) -> str:
    parsed = urlparse(raw_url)
    scheme = parsed.scheme or "https"
    netloc = parsed.netloc.lower()
    path = parsed.path.rstrip("/") or "/"
    return urlunparse((scheme, netloc, path, "", "", ""))


def root_domain(url: str) -> str:
    host = urlparse(url).netloc.lower()
    return host[4:] if host.startswith("www.") else host


def is_internal_url(candidate: str, homepage_domain: str) -> bool:
    parsed = urlparse(candidate)
    candidate_domain = parsed.netloc.lower()
    return candidate_domain == homepage_domain or candidate_domain.endswith(f".{homepage_domain}")


def is_probably_html_url(url: str) -> bool:
    blocked_suffixes = (
        ".pdf",
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".webp",
        ".svg",
        ".zip",
        ".doc",
        ".docx",
        ".xls",
        ".xlsx",
        ".ppt",
        ".pptx",
    )
    return not urlparse(url).path.lower().endswith(blocked_suffixes)


def extract_internal_links(html: str, base_url: str, homepage_domain: str) -> set[str]:
    soup = BeautifulSoup(html, "html.parser")
    links: set[str] = set()
    for anchor in soup.select("a[href]"):
        href = anchor.get("href")
        if not href or href.startswith(("mailto:", "tel:", "javascript:", "#")):
            continue
        absolute_url = canonicalize_url(urljoin(base_url, href))
        if is_internal_url(absolute_url, homepage_domain) and is_probably_html_url(absolute_url):
            links.add(absolute_url)
    return links


def classify_target_page(url: str, title: str | None, text: str) -> TargetPage | None:
    haystack = " ".join([url, title or "", text[:2500]])
    matches = []
    for page_type, pattern in TARGET_PAGE_PATTERNS.items():
        if pattern.search(haystack):
            matches.append(page_type)

    if not matches:
        return None

    confidence = min(0.98, 0.45 + (0.18 * len(matches)))
    path_bonus = 0.15 if any(pattern.search(url) for pattern in TARGET_PAGE_PATTERNS.values()) else 0
    return TargetPage(
        url=url,
        page_type=matches[0],
        confidence=round(min(0.99, confidence + path_bonus), 2),
        title=title,
    )


def dedupe_preserve_order(values: Iterable[str]) -> list[str]:
    seen = set()
    deduped = []
    for value in values:
        clean = value.strip().rstrip("/),.;")
        if clean and clean.lower() not in seen:
            seen.add(clean.lower())
            deduped.append(clean)
    return deduped


def extract_social_links(html: str) -> SocialLinks:
    links_by_type = {}
    for key, pattern in SOCIAL_PATTERNS.items():
        links_by_type[key] = dedupe_preserve_order(pattern.findall(html))
    return SocialLinks(**links_by_type)


def title_hint_from_text(text: str) -> str | None:
    match = CONTACT_TITLE_PATTERNS.search(text)
    return match.group(0) if match else None


def extract_contacts(html: str, source_url: str) -> list[ExtractedContact]:
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text(" ", strip=True)
    html_and_text = f"{html} {text}"

    emails = dedupe_preserve_order(EMAIL_PATTERN.findall(html_and_text))
    phones = dedupe_preserve_order(PHONE_PATTERN.findall(text))
    socials = extract_social_links(html)
    title_hint = title_hint_from_text(text)

    contacts: list[ExtractedContact] = []
    for email in emails:
        contacts.append(
            ExtractedContact(
                email=email,
                phone=phones[0] if phones else None,
                linkedin_url=socials.linkedin[0] if socials.linkedin else None,
                title_hint=title_hint,
                source_url=source_url,
                confidence=0.72 if title_hint else 0.58,
            )
        )

    if not contacts and (phones or socials.linkedin):
        contacts.append(
            ExtractedContact(
                phone=phones[0] if phones else None,
                linkedin_url=socials.linkedin[0] if socials.linkedin else None,
                title_hint=title_hint,
                source_url=source_url,
                confidence=0.42,
            )
        )

    return contacts


async def fetch_with_httpx(client: httpx.AsyncClient, url: str) -> PageFetch | None:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    try:
        response = await client.get(url, headers=headers, follow_redirects=True, timeout=15)
        content_type = response.headers.get("content-type", "")
        if "text/html" not in content_type and "application/xhtml" not in content_type:
            return None
        return PageFetch(str(response.url), response.status_code, response.text)
    except httpx.HTTPError:
        return None


async def fetch_with_playwright(url: str) -> PageFetch | None:
    if async_playwright is None:
        return None

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36"
            )
        )
        try:
            response = await page.goto(url, wait_until="domcontentloaded", timeout=25000)
            await page.wait_for_timeout(1200)
            html = await page.content()
            status = response.status if response else 0
            return PageFetch(page.url, status, html)
        except Exception:
            return None
        finally:
            await browser.close()


async def enrich_contacts_mock(domain: str, contacts: list[ExtractedContact]) -> EnrichmentResult:
    # Legacy function name retained for callers. Never invent an address from a domain.
    return EnrichmentResult(
        provider="public_website",
        status="public_contacts_found" if contacts else "missing",
        contacts=contacts,
        notes="Public extraction only; contact ownership and deliverability are unverified.",
    )


async def crawl_homepage(request: CrawlRequest) -> CrawlResult:
    homepage = canonicalize_url(str(request.homepage_url))
    homepage_domain = root_domain(homepage)
    visited: set[str] = set()
    queue: list[tuple[str, int]] = [(homepage, 0)]
    target_pages: list[TargetPage] = []
    all_contacts: list[ExtractedContact] = []
    collected_socials = SocialLinks()

    async with httpx.AsyncClient() as client:
        while queue and len(visited) < request.max_pages:
            current_url, depth = queue.pop(0)
            if current_url in visited or depth > request.max_depth:
                continue
            visited.add(current_url)

            fetched = await fetch_with_httpx(client, current_url)
            if request.use_browser and (not fetched or fetched.status_code >= 400):
                fetched = await fetch_with_playwright(current_url)
            if not fetched or fetched.status_code >= 500:
                continue

            soup = BeautifulSoup(fetched.html, "html.parser")
            title = soup.title.get_text(" ", strip=True) if soup.title else None
            text = soup.get_text(" ", strip=True)

            target = classify_target_page(fetched.url, title, text)
            if target:
                target_pages.append(target)

            all_contacts.extend(extract_contacts(fetched.html, fetched.url))
            page_socials = extract_social_links(fetched.html)
            collected_socials.linkedin.extend(page_socials.linkedin)
            collected_socials.instagram.extend(page_socials.instagram)
            collected_socials.facebook.extend(page_socials.facebook)

            if depth < request.max_depth:
                for link in extract_internal_links(fetched.html, fetched.url, homepage_domain):
                    if link not in visited:
                        queue.append((link, depth + 1))

            await asyncio.sleep(0.25)

    all_contacts = list({contact.model_dump_json(): contact for contact in all_contacts}.values())
    collected_socials = SocialLinks(
        linkedin=dedupe_preserve_order(collected_socials.linkedin),
        instagram=dedupe_preserve_order(collected_socials.instagram),
        facebook=dedupe_preserve_order(collected_socials.facebook),
    )
    target_pages = sorted(
        {page.url + page.page_type: page for page in target_pages}.values(),
        key=lambda page: page.confidence,
        reverse=True,
    )
    enrichment = await enrich_contacts_mock(homepage_domain, all_contacts)

    ready_for_insert = {
        "institution": {
            "website_url": homepage,
            "domain": homepage_domain,
            "gift_shop_url": next((p.url for p in target_pages if p.page_type == "gift_shop"), None),
            "wholesale_url": next((p.url for p in target_pages if p.page_type == "wholesale"), None),
            "vendor_application_url": next((p.url for p in target_pages if p.page_type == "vendor"), None),
            "linkedin_company_url": collected_socials.linkedin[0] if collected_socials.linkedin else None,
            "facebook_url": collected_socials.facebook[0] if collected_socials.facebook else None,
            "instagram_url": collected_socials.instagram[0] if collected_socials.instagram else None,
            "has_museum_store": any(p.page_type == "gift_shop" for p in target_pages),
            "has_wholesale_program": any(p.page_type == "wholesale" for p in target_pages),
            "accepts_vendor_applications": any(p.page_type == "vendor" for p in target_pages),
            "last_scraped_at": datetime.now(timezone.utc).isoformat(),
        },
        "contacts": [contact.model_dump() for contact in enrichment.contacts],
        "scraping_log": {
            "target_url": homepage,
            "normalized_domain": homepage_domain,
            "status": "success",
            "pages_discovered": len(visited),
            "contacts_found": len(all_contacts),
            "gift_shop_detected": any(p.page_type == "gift_shop" for p in target_pages),
            "vendor_page_detected": any(p.page_type == "vendor" for p in target_pages),
            "wholesale_page_detected": any(p.page_type == "wholesale" for p in target_pages),
        },
    }

    return CrawlResult(
        institution_homepage=homepage,
        domain=homepage_domain,
        crawled_pages=len(visited),
        target_pages=target_pages,
        contacts=all_contacts,
        social_links=collected_socials,
        enrichment=enrichment,
        ready_for_insert=ready_for_insert,
        scraped_at=datetime.now(timezone.utc),
    )


@router.post("/crawl", response_model=CrawlResult)
async def crawl_endpoint(request: CrawlRequest) -> CrawlResult:
    try:
        return await crawl_homepage(request)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"crawl_failed: {exc}") from exc
