"""Offline recovery regressions. Never crawl, send mail or call a provider."""
import json
import os
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.services.daily_crawler import DailyCrawler
from app.services.discovery_engine import DiscoveryEngine
from app.services.lead_scoring_engine import LeadScoringEngine


class RuntimeTests(unittest.TestCase):
    def setUp(self):
        self.enterContext(patch.dict(os.environ, {
            "SERPAPI_API_KEY": "", "BING_SEARCH_API_KEY": "",
            "OPENAI_API_KEY": "", "ANTHROPIC_API_KEY": "",
        }))
        # Block HTTP transports, leaving Windows asyncio's internal sockets alone.
        self.enterContext(patch("httpx.AsyncClient.send", side_effect=AssertionError("External HTTP forbidden")))
        self.enterContext(patch("httpx.HTTPTransport.handle_request", side_effect=AssertionError("External HTTP forbidden")))
        self.enterContext(patch("app.api.leads.crawl_homepage", side_effect=AssertionError("Crawling forbidden")))
        self.client = self.enterContext(TestClient(app))

    def test_health_docs_and_schema(self):
        self.assertEqual(self.client.get("/health").json(), {"status": "ok"})
        self.assertEqual(self.client.get("/docs").status_code, 200)
        schema = self.client.get("/openapi.json").json()
        self.assertIn("/api/v1/leads/crawl", schema["paths"])
        self.assertIn("/api/v1/crm/generate-draft", schema["paths"])

    def test_all_discovery_phases_without_keys(self):
        for phase in DiscoveryEngine().source_config():
            with self.subTest(phase=phase):
                response = self.client.post("/api/v1/leads/discover-targets", json={"phase": phase, "max_results": 12})
                self.assertEqual(response.status_code, 200)
                result = response.json()
                self.assertEqual(result["mode"], "query_plan_no_api_key")
                self.assertTrue(result["requires_api_key_for_live_search"])
                self.assertTrue(result["targets"])
                self.assertTrue(all(t["homepage_url"].startswith("discovery://") for t in result["targets"]))

    def test_no_key_guard_does_not_crawl(self):
        response = self.client.post("/api/v1/leads/discover-and-crawl", json={"phase": "museums"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "blocked_needs_search_api_key")

    def test_read_routes_and_invalid_crawl(self):
        self.assertEqual(self.client.get("/api/v1/leads").status_code, 200)
        self.assertEqual(self.client.get("/api/v1/leads/daily-update").status_code, 200)
        response = self.client.post("/api/v1/leads/crawl", json={"homepage_url": "not-a-url"})
        self.assertEqual(response.status_code, 422)

    def test_existing_seeds_and_scoring(self):
        self.assertEqual(len(DailyCrawler().load_targets()), 4)
        root = Path(__file__).resolve().parents[2]
        records = json.loads((root / "frontend/data/lead-discovery/seed-leads.json").read_text(encoding="utf-8"))
        self.assertEqual(len(records), 100)
        names = {"The Museum of Modern Art", "Art Institute of Chicago", "J. Paul Getty Museum"}
        museums = [record for record in records if record["name"] in names]
        self.assertEqual(len(museums), 3)
        for record in museums:
            score = LeadScoringEngine().score(record)
            self.assertTrue(any("Online store detected." in part.signals for part in score.breakdown))


if __name__ == "__main__":
    unittest.main()
