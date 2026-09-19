from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Literal
from urllib.parse import urlparse

from fastapi import APIRouter
from pydantic import BaseModel, HttpUrl

from app.services.lead_repository import LeadRepository
from app.services.lead_scoring_engine import LeadScoringEngine
from app.services.scraper_engine import CrawlRequest, crawl_homepage
from app.services.discovery_engine import DiscoveryEngine


router = APIRouter(prefix="/api/v1/leads", tags=["leads"])
repository = LeadRepository()
discovery_engine = DiscoveryEngine()

LeadCategory = Literal["Museum", "University", "Corporate", "Zoo/Aquarium", "Attraction"]
DiscoveryPhase = Literal["museums", "universities", "attractions", "corporate", "schools"]


class CrawlLeadRequest(BaseModel):
    homepage_url: HttpUrl
    category: LeadCategory = "Museum"


class BatchCrawlTarget(BaseModel):
    homepage_url: HttpUrl
    category: LeadCategory = "Museum"


class BatchCrawlRequest(BaseModel):
    targets: list[BatchCrawlTarget]
    max_targets: int = 25


class DiscoverTargetsRequest(BaseModel):
    phase: DiscoveryPhase = "museums"
    region: str = "North America"
    max_results: int = 20


class DiscoverAndCrawlRequest(BaseModel):
    phase: DiscoveryPhase = "museums"
    region: str = "North America"
    max_results: int = 50
    crawl_limit: int = 10


@router.get("")
async def list_leads() -> dict:
    # Old disk records may carry heuristic Verified labels. Never expose these
    # as verified contacts; leave the historical source file untouched.
    return {"leads": [{**lead, "contactStatus": "Unverified"} if lead.get("contactStatus") == "Verified" else lead
                      for lead in repository.list_leads()]}


@router.post("/discover-targets")
async def discover_targets(request: DiscoverTargetsRequest) -> dict:
    result = await discovery_engine.discover(request.phase, request.max_results)
    result["region"] = request.region
    return result


@router.post("/discover-and-crawl")
async def discover_and_crawl(request: DiscoverAndCrawlRequest) -> dict:
    discovery = await discovery_engine.discover(request.phase, request.max_results)
    if discovery["requires_api_key_for_live_search"]:
        return {
            "status": "blocked_needs_search_api_key",
            "message": "Set SERPAPI_API_KEY or BING_SEARCH_API_KEY to run live automatic discovery.",
            "discovery": discovery,
        }

    crawl_targets = [
        BatchCrawlTarget(homepage_url=target["homepage_url"], category=target["category"])
        for target in discovery["targets"]
        if target["homepage_url"].startswith("http")
    ][: request.crawl_limit]
    crawl_result = await crawl_batch(BatchCrawlRequest(targets=crawl_targets, max_targets=request.crawl_limit))
    return {"status": "complete", "discovery": discovery, "crawl": crawl_result}


@router.post("/crawl")
async def crawl_and_score_lead(request: CrawlLeadRequest) -> dict:
    crawl_result = await crawl_homepage(
        CrawlRequest(
            homepage_url=request.homepage_url,
            max_depth=2,
            max_pages=24,
            use_browser=False,
        )
    )

    record = crawl_result.ready_for_insert["institution"]
    record.update(
        {
            "name": title_from_domain(crawl_result.domain),
            "category": category_to_backend(request.category),
            "scraped_text": " ".join([page.title or page.url for page in crawl_result.target_pages]),
            "contacts": [contact.model_dump() for contact in crawl_result.enrichment.contacts],
            "target_pages": [page.model_dump() for page in crawl_result.target_pages],
        }
    )
    score_result = LeadScoringEngine().score(record)
    lead = lead_from_crawl(request, crawl_result, score_result.overall_score)
    repository.upsert_lead(lead)

    return {"lead": lead, "score_breakdown": [item.__dict__ for item in score_result.breakdown]}


@router.post("/crawl-batch")
async def crawl_batch(request: BatchCrawlRequest) -> dict:
    created = []
    failed = []
    targets = request.targets[: request.max_targets]

    for target in targets:
        try:
            result = await crawl_and_score_lead(CrawlLeadRequest(homepage_url=target.homepage_url, category=target.category))
            created.append(result["lead"])
        except Exception as exc:
            failed.append({"homepage_url": str(target.homepage_url), "error": str(exc)})

    return {
        "status": "complete",
        "started_targets": len(targets),
        "created_or_updated": len(created),
        "failed": len(failed),
        "leads": created,
        "errors": failed,
        "finished_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/daily-update")
async def daily_update() -> dict:
    leads = repository.list_leads()
    high_score = [lead for lead in leads if lead.get("score", 0) >= 80]
    # Historical heuristic 'Verified' is not proof of human contact verification.
    verified = [lead for lead in leads if lead.get("contact_verification") == "verified_by_reviewer"]
    not_contacted = [lead for lead in leads if lead.get("pipelineStage") == "Not Contacted"]

    return {
        "date": datetime.now(timezone.utc).date().isoformat(),
        "total_leads": len(leads),
        "high_score_leads": len(high_score),
        "verified_contacts": len(verified),
        "ready_to_contact": len(not_contacted),
        "top_leads": sorted(high_score, key=lambda lead: lead.get("score", 0), reverse=True)[:10],
    }


def lead_from_crawl(request: CrawlLeadRequest, crawl_result, score: float) -> dict:
    domain = crawl_result.domain
    institution = crawl_result.ready_for_insert["institution"]
    contacts = crawl_result.enrichment.contacts
    target_pages = crawl_result.target_pages

    gift_shop = next((page.url for page in target_pages if page.page_type == "gift_shop"), institution.get("gift_shop_url"))
    wholesale = next((page.url for page in target_pages if page.page_type == "wholesale"), institution.get("wholesale_url"))
    vendor = next((page.url for page in target_pages if page.page_type == "vendor"), institution.get("vendor_application_url"))
    direct_contact = next((contact for contact in contacts if contact.email), None)

    return {
        "id": hashlib.sha1(domain.encode("utf-8")).hexdigest()[:12],
        "name": title_from_domain(domain),
        "category": request.category,
        "state": "NA",
        "city": "Research",
        "score": round(score),
        "contactStatus": "Unverified" if contacts else "Missing",
        "contact_verification": "unverified" if contacts else "missing",
        "email": direct_contact.email if direct_contact else None,
        "phone": next((contact.phone for contact in contacts if contact.phone), None),
        "contact_page": direct_contact.source_url if direct_contact else None,
        "contacts": [contact.model_dump() for contact in contacts],
        "pipelineStage": "Not Contacted",
        "decisionMaker": direct_contact.title_hint if direct_contact else "Retail / procurement contact needed",
        "websiteUrl": str(request.homepage_url),
        "giftShopUrl": gift_shop,
        "vendorUrl": vendor,
        "wholesaleUrl": wholesale,
        "theme": theme_from_pages(target_pages),
        "productIdea": product_idea_for_category(request.category),
        "latitude": 39,
        "longitude": -98,
        "notes": [
            f"Crawled {crawl_result.crawled_pages} internal pages",
            f"Found {len(target_pages)} commercial target pages",
            f"Contact enrichment status: {crawl_result.enrichment.status}",
        ],
    }


def title_from_domain(domain_or_url: str) -> str:
    host = urlparse(domain_or_url).netloc or domain_or_url
    host = host.replace("www.", "").split(".")[0]
    return " ".join(part.capitalize() for part in host.replace("-", " ").split())


def theme_from_pages(target_pages) -> str:
    if not target_pages:
        return "Homepage captured. Run deeper enrichment to identify collection, shop, and vendor signals."
    page_types = ", ".join(sorted({page.page_type.replace("_", " ") for page in target_pages}))
    return f"Detected commercial page signals: {page_types}."


def product_idea_for_category(category: LeadCategory) -> str:
    if category == "Corporate":
        return "Executive cultural gift box"
    if category == "University":
        return "Custom campus gift capsule"
    if category == "Zoo/Aquarium":
        return "Family-friendly conservation merch"
    if category == "Attraction":
        return "Landmark souvenir collection"
    return "Custom cultural merchandise capsule"


def category_to_backend(category: LeadCategory) -> str:
    return {
        "Museum": "museum",
        "University": "university",
        "Corporate": "corporate",
        "Zoo/Aquarium": "aquarium",
        "Attraction": "tourism_attraction",
    }[category]


def seed_discovery_targets(phase: DiscoveryPhase) -> list[dict]:
    seeds: dict[DiscoveryPhase, list[dict]] = {
        "museums": [
            {"homepage_url": "https://asianart.org", "category": "Museum", "source": "curated museum seed"},
            {"homepage_url": "https://www.metmuseum.org", "category": "Museum", "source": "curated museum seed"},
            {"homepage_url": "https://www.pem.org", "category": "Museum", "source": "curated museum seed"},
            {"homepage_url": "https://www.fieldmuseum.org", "category": "Museum", "source": "curated museum seed"},
        ],
        "universities": [
            {"homepage_url": "https://www.ubookstore.com", "category": "University", "source": "campus store seed"},
            {"homepage_url": "https://shop.uclastore.com", "category": "University", "source": "campus store seed"},
            {"homepage_url": "https://www.thecoop.com", "category": "University", "source": "campus store seed"},
        ],
        "attractions": [
            {"homepage_url": "https://www.grandcanyon.org", "category": "Attraction", "source": "tourism seed"},
            {"homepage_url": "https://www.montereybayaquarium.org", "category": "Zoo/Aquarium", "source": "tourism seed"},
            {"homepage_url": "https://www.sdzsafaripark.org", "category": "Zoo/Aquarium", "source": "tourism seed"},
        ],
        "corporate": [
            {"homepage_url": "https://www.marriott.com", "category": "Corporate", "source": "corporate seed"},
            {"homepage_url": "https://www.hyatt.com", "category": "Corporate", "source": "corporate seed"},
            {"homepage_url": "https://www.salesforce.com", "category": "Corporate", "source": "corporate seed"},
        ],
        "schools": [
            {"homepage_url": "https://www.nais.org", "category": "University", "source": "school network seed"},
            {"homepage_url": "https://www.acsi.org", "category": "University", "source": "school network seed"},
        ],
    }
    return seeds[phase]
