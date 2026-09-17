from __future__ import annotations

import hashlib
import json
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal
from urllib.parse import urlparse

import httpx


DiscoveryPhase = Literal["museums", "universities", "attractions", "corporate", "schools"]


@dataclass(frozen=True)
class DiscoveryTarget:
    homepage_url: str
    category: str
    source: str
    confidence: float
    query: str | None = None


class DiscoveryEngine:
    """Discovers candidate institution homepages before detailed crawling.

    Production mode uses a compliant search API when configured. Without an API
    key it returns a clearly marked seed/query plan so the UI does not pretend
    a live discovery run happened.
    """

    def __init__(self, source_path: Path | None = None) -> None:
        self.source_path = source_path or Path(__file__).resolve().parents[1] / "data" / "discovery_sources.json"

    def source_config(self) -> dict[str, Any]:
        return json.loads(self.source_path.read_text(encoding="utf-8"))

    async def discover(self, phase: DiscoveryPhase, max_results: int = 100) -> dict[str, Any]:
        config = self.source_config()[phase]
        api_mode = self._api_mode()

        if api_mode == "serpapi":
            targets = await self._discover_with_serpapi(config, max_results)
        elif api_mode == "bing":
            targets = await self._discover_with_bing(config, max_results)
        else:
            targets = self._query_plan_targets(config, max_results)

        deduped = self._dedupe_targets(targets)
        return {
            "phase": phase,
            "mode": api_mode or "query_plan_no_api_key",
            "target_count_goal": config["target_count"],
            "directory_sources": config["directory_sources"],
            "search_queries": config["search_queries"],
            "targets": [target.__dict__ for target in deduped[:max_results]],
            "requires_api_key_for_live_search": api_mode is None,
        }

    def _api_mode(self) -> str | None:
        if os.getenv("SERPAPI_API_KEY"):
            return "serpapi"
        if os.getenv("BING_SEARCH_API_KEY"):
            return "bing"
        return None

    async def _discover_with_serpapi(self, config: dict[str, Any], max_results: int) -> list[DiscoveryTarget]:
        targets: list[DiscoveryTarget] = []
        api_key = os.environ["SERPAPI_API_KEY"]
        async with httpx.AsyncClient(timeout=25) as client:
            for query in config["search_queries"]:
                if len(targets) >= max_results:
                    break
                response = await client.get(
                    "https://serpapi.com/search.json",
                    params={"engine": "google", "q": query, "api_key": api_key, "num": 20},
                )
                response.raise_for_status()
                data = response.json()
                for item in data.get("organic_results", []):
                    link = item.get("link")
                    target = self._target_from_url(link, config["category"], "serpapi", query)
                    if target:
                        targets.append(target)
        return targets

    async def _discover_with_bing(self, config: dict[str, Any], max_results: int) -> list[DiscoveryTarget]:
        targets: list[DiscoveryTarget] = []
        api_key = os.environ["BING_SEARCH_API_KEY"]
        async with httpx.AsyncClient(timeout=25) as client:
            for query in config["search_queries"]:
                if len(targets) >= max_results:
                    break
                response = await client.get(
                    "https://api.bing.microsoft.com/v7.0/search",
                    params={"q": query, "count": 25},
                    headers={"Ocp-Apim-Subscription-Key": api_key},
                )
                response.raise_for_status()
                data = response.json()
                for item in data.get("webPages", {}).get("value", []):
                    target = self._target_from_url(item.get("url"), config["category"], "bing", query)
                    if target:
                        targets.append(target)
        return targets

    def _query_plan_targets(self, config: dict[str, Any], max_results: int) -> list[DiscoveryTarget]:
        # These are not fake crawled institutions. They are queued discovery jobs
        # showing what live API discovery will execute when credentials are set.
        targets = []
        for index, query in enumerate(config["search_queries"][:max_results]):
            pseudo_url = f"discovery://{hashlib.sha1(query.encode('utf-8')).hexdigest()[:10]}"
            targets.append(
                DiscoveryTarget(
                    homepage_url=pseudo_url,
                    category=config["category"],
                    source="query_plan_requires_search_api",
                    confidence=0.0,
                    query=query,
                )
            )
        return targets

    def _target_from_url(self, url: str | None, category: str, source: str, query: str) -> DiscoveryTarget | None:
        if not url or url.startswith("discovery://"):
            return None
        parsed = urlparse(url)
        if not parsed.scheme.startswith("http") or not parsed.netloc:
            return None
        domain = parsed.netloc.lower().removeprefix("www.")
        if self._is_low_value_domain(domain):
            return None
        homepage_url = f"{parsed.scheme}://{parsed.netloc}"
        return DiscoveryTarget(homepage_url=homepage_url, category=category, source=source, confidence=0.62, query=query)

    @staticmethod
    def _is_low_value_domain(domain: str) -> bool:
        blocked = (
            "google.",
            "facebook.",
            "instagram.",
            "linkedin.",
            "youtube.",
            "wikipedia.",
            "yelp.",
            "tripadvisor.",
            "eventbrite.",
        )
        return any(token in domain for token in blocked)

    @staticmethod
    def _dedupe_targets(targets: list[DiscoveryTarget]) -> list[DiscoveryTarget]:
        seen = set()
        deduped = []
        for target in targets:
            key = re.sub(r"^https?://(www\.)?", "", target.homepage_url).split("/")[0].lower()
            if key not in seen:
                seen.add(key)
                deduped.append(target)
        return deduped
