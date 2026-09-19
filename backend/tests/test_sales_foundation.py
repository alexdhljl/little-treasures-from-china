"""Offline contracts: temporary SQLite only; all outbound HTTP is forbidden."""
import asyncio
import json
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from fastapi.testclient import TestClient
from app.main import app
from app.api.sales_leads import repository
from app.api.leads import CrawlLeadRequest, lead_from_crawl
from app.services.institution_normalization import normalized_domain, normalized_website, name_location_key
from app.services.sales_lead_model import InstitutionLeadInput, eligibility, seed_to_input, INSTITUTION_TYPES, SALES_SIGNALS
from app.services.sales_lead_repository import SalesLeadRepository, PoolConflict
from app.services.sales_lead_csv import export_csv, parse_csv
from app.services.scraper_engine import enrich_contacts_mock, ExtractedContact
from app.services.lead_scoring_engine import LeadScoringEngine

ROOT = Path(__file__).resolve().parents[2]


class SalesFoundationTests(unittest.TestCase):
    def setUp(self):
        self.temp = self.enterContext(tempfile.TemporaryDirectory())
        self.repo = SalesLeadRepository(Path(self.temp) / "pool.sqlite3")
        self.enterContext(patch("httpx.AsyncClient.send", side_effect=AssertionError("External HTTP forbidden")))
        self.enterContext(patch("httpx.HTTPTransport.handle_request", side_effect=AssertionError("External HTTP forbidden")))
        app.dependency_overrides[repository] = lambda: self.repo
        self.addCleanup(app.dependency_overrides.clear)
        self.client = self.enterContext(TestClient(app))

    def lead(self, index=0, **values):
        return InstitutionLeadInput(**{**dict(institution_name=f"Test Institution {index}", city="New York", state="NY", country="US", website=f"https://institution{index}.example.org"), **values})

    def approve(self):
        for row in self.repo.list(limit=10000)["items"]:
            self.repo.update(row["id"], {"review_status": "approved"}, row["revision"])

    def test_100_seed_csv_roundtrip_and_repeated_import(self):
        seeds = json.loads((ROOT / "frontend/data/lead-discovery/seed-leads.json").read_text(encoding="utf-8"))
        legacy = parse_csv((ROOT / "frontend/data/lead-discovery/seed-leads.csv").read_text(encoding="utf-8"))
        self.assertEqual(len(legacy), 100)
        self.assertEqual(self.repo.import_records(legacy)["created"], 100)
        before = self.repo.export_records()
        exported = export_csv(before)
        self.assertTrue(exported.startswith(b"\xef\xbb\xbf"))
        for rows in [parse_csv(exported.decode("utf-8-sig")), legacy, [seed_to_input(row) for row in seeds]]:
            result = self.repo.import_records(rows)
            self.assertEqual((result["created"], result["duplicates"]), (0, 100))
        self.assertEqual([row["id"] for row in before], [row["id"] for row in self.repo.export_records()])
        self.assertEqual(self.repo.list()["total"], 100)
        self.assertTrue({"The Museum of Modern Art", "Art Institute of Chicago", "J. Paul Getty Museum"}.issubset({x.institution_name for x in legacy}))

    def test_csv_multiline_unicode_quotes_and_formula_safety(self):
        record = self.lead(notes='=SUM(1,2)\r\n文化 "Gift Shop"', phone="+1 212 555 0100", contact_page="https://institution0.example.org/contact")
        content = export_csv([record.model_dump()]).decode("utf-8-sig")
        self.assertIn("'=SUM", content)
        parsed = parse_csv(content)
        self.assertEqual(len(parsed), 1)
        self.assertEqual(parsed[0].notes, record.notes)
        self.assertEqual(parsed[0].phone, record.phone)
        for value in ["'literal", "@formula", "-example", "+example", "中文,quote\"\nline"]:
            self.assertEqual(parse_csv(export_csv([self.lead(notes=value).model_dump()]).decode("utf-8-sig"))[0].notes, value)

    def test_normalized_domains_and_websites(self):
        for value in ["http://WWW.Example.org/", "https://example.org/shop/", " example.org "]:
            self.assertEqual(normalized_domain(value), "example.org")
        self.assertEqual(normalized_website("HTTP://WWW.Example.org//shop/?utm_source=x&b=2&a=1#top"), "https://example.org/shop?a=1&b=2")
        self.assertEqual(normalized_website("https://example.org/index.html"), "https://example.org")
        self.assertNotEqual(normalized_website("https://example.org/A"), normalized_website("https://example.org/a"))
        self.assertEqual(name_location_key(" J. Paul  Getty—Museum ", "Los Angeles", "CA", "USA"), name_location_key("j paul getty museum", "los angeles", "ca", "US"))
        for value in ["javascript:alert(1)", "http://localhost", "https://user:pass@example.org", "http://127.0.0.1"]:
            with self.assertRaises(ValueError): normalized_website(value)

    def test_all_duplicate_reasons_and_conflict_evidence(self):
        self.repo.import_records([self.lead()])
        result = self.repo.import_records([self.lead(website="http://www.institution0.example.org/shop/")])
        self.assertEqual(result["results"][0]["duplicate_reason"], "same_domain")
        self.assertEqual(self.repo.import_records([self.lead(country=None, state="New York", website="https://newhost.example.org")])["results"][0]["duplicate_reason"], "same_name_location")
        source = self.lead(1, website=None, source_url="https://directory.example.org/venue/1", source_type="public_directory")
        self.repo.import_records([source])
        self.assertEqual(self.repo.import_records([source])["results"][0]["duplicate_reason"], "same_website")
        renamed_url = self.lead(website="https://new-website.example.org", institution_name="  TEST Institution 0. ")
        self.assertEqual(self.repo.import_records([renamed_url])["results"][0]["duplicate_reason"], "same_name_location")
        conflict = self.repo.import_records([self.lead(institution_name="Different Campus", city="Boston")])
        self.assertEqual(conflict["review_required"], 1)
        self.assertEqual(self.repo.list()["total"], 2)
        self.assertTrue(any(event["incoming"]["institution_name"] == "Different Campus" and event["needs_review"] for event in self.repo.duplicate_events()))
        # Independent listings on a directory domain remain independent institutions.
        self.assertEqual(self.repo.import_records([self.lead(2, website=None, source_url="https://directory.example.org/venue/2", source_type="public_directory")])["created"], 1)

    def test_email_optional_and_pool_review_gate(self):
        self.repo.import_records([self.lead(email=None), self.lead(1, city=None, state=None)])
        first, incomplete = self.repo.list()["items"]
        approved = self.repo.update(first["id"], {"review_status": "approved"}, first["revision"])
        self.assertTrue(approved["pool_ready"])
        self.assertEqual(approved["contact_verification"], "missing")
        with self.assertRaises(ValueError): self.repo.update(incomplete["id"], {"review_status": "approved"}, incomplete["revision"])
        self.assertEqual(eligibility(self.lead(website=None, source_url="https://public.example.org/1", source_type="government").model_dump()), [])
        self.assertIn("website_or_trusted_public_source", eligibility(self.lead(website=None, source_url="https://public.example.org/1", source_type="unknown").model_dump()))

    def test_no_synthetic_contacts_and_unverified_semantics(self):
        self.assertEqual(asyncio.run(enrich_contacts_mock("museum.example.org", [])).contacts, [])
        self.assertIsNone(self.lead(email="info@institution0.example.org").email)
        self.assertIsNone(self.lead(email="partnerships+1234abcd@institution0.example.org", source_url="https://institution0.example.org").email)
        contact = ExtractedContact(email="public@institution0.example.org", source_url="https://institution0.example.org/contact", confidence=.9, title_hint="Retail Director")
        enrichment = asyncio.run(enrich_contacts_mock("institution0.example.org", [contact]))
        self.assertEqual(enrichment.contacts, [contact])
        result = lead_from_crawl(CrawlLeadRequest(homepage_url="https://institution0.example.org"), SimpleNamespace(domain="institution0.example.org", ready_for_insert={"institution": {}}, enrichment=enrichment, target_pages=[], crawled_pages=1), 50)
        self.assertEqual(result["contactStatus"], "Unverified")
        self.assertEqual(result["email"], contact.email)
        # Previously a nonempty contact list reached a missing regex import.
        LeadScoringEngine().score({"contacts": [contact.model_dump()]})
        with patch("app.api.leads.repository.list_leads", return_value=[{"id": "historical", "contactStatus": "Verified"}]):
            self.assertEqual(self.client.get("/api/v1/leads").json()["leads"][0]["contactStatus"], "Unverified")
            self.assertEqual(self.client.get("/api/v1/leads/daily-update").json()["verified_contacts"], 0)

    def test_500_assignment_unique_repeatable_and_persistent(self):
        self.repo.import_records([self.lead(i) for i in range(500)])
        self.approve()
        owners = [f"Sales {c}" for c in "ABCDE"]
        result = self.repo.assign(owners, 100)
        self.assertEqual(result["assigned_now"], 500)
        self.assertEqual(list(result["counts"].values()), [100] * 5)
        self.assertEqual(self.repo.assign(owners, 100)["assigned_now"], 0)
        reopened = SalesLeadRepository(self.repo.path)
        rows = reopened.export_records()
        self.assertEqual(len({x["id"] for x in rows}), 500)
        self.assertTrue(all(x["assigned_salesperson"] for x in rows))
        self.assertEqual(len(reopened.export_records("Sales A")), 100)
        self.assertEqual(reopened.list(limit=100, offset=400)["total"], 500)

    def test_shortage_and_concurrent_assignment(self):
        self.repo.import_records([self.lead(i) for i in range(25)])
        self.approve()
        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(lambda name: self.repo.assign([name], 100), ["Sales A", "Sales B"]))
        self.assertEqual(sum(r["assigned_now"] for r in results), 25)
        self.assertEqual(sum(sum(r["shortfall"].values()) for r in results), 175)
        self.assertEqual(len(self.repo.export_records()), 25)
        with self.assertRaises(ValueError): self.repo.assign(["!!!"], 100)

    def test_reimport_preserves_owner_notes_review_status_and_ids(self):
        self.repo.import_records([self.lead()])
        self.approve()
        self.repo.assign(["Sales A"], 100)
        before = self.repo.list()["items"][0]
        edited = self.repo.update(before["id"], {"notes": "Sales research", "status": "follow_up"}, before["revision"])
        self.repo.import_records(parse_csv(export_csv([edited]).decode("utf-8-sig")))
        after = self.repo.list()["items"][0]
        for key in ["id", "notes", "status", "assigned_salesperson", "review_status", "created_at", "revision"]:
            self.assertEqual(after[key], edited[key])
        with self.assertRaises(PoolConflict): self.repo.update(before["id"], {"notes": "stale"}, before["revision"])

    def test_atomic_import_and_csv_errors(self):
        with self.assertRaises(ValueError): self.repo.import_records([self.lead(), InstitutionLeadInput()])
        self.assertEqual(self.repo.list()["total"], 0)
        for content in ['institution_name,institution_name\nA,B', 'institution_name,city\nA,B,C', 'bad_header\nvalue', 'institution_name,city\n"unclosed,B']:
            self.assertEqual(self.client.post("/api/v1/sales-leads/import/csv", json={"content": content}).status_code, 422)

    def test_api_full_flow_without_external_access(self):
        base = "/api/v1/sales-leads"
        self.assertFalse(self.client.get(base + "/metadata").json()["external_discovery_enabled"])
        self.assertEqual(self.client.post(base + "/import/seeds").json()["created"], 100)
        self.assertEqual(self.client.post(base + "/import/seeds").json()["duplicates"], 100)
        row = self.client.get(base, params={"query": "Modern Art"}).json()["items"][0]
        patch_body = {"revision": row["revision"], "review_status": "approved"}
        self.assertEqual(self.client.patch(base + "/" + row["id"], json=patch_body).status_code, 200)
        self.assertEqual(self.client.patch(base + "/" + row["id"], json=patch_body).status_code, 409)
        assigned = self.client.post(base + "/assign", json={"salespeople": ["Sales A", "sales a"], "target_per_person": 100}).json()
        self.assertEqual(assigned["assigned_now"], 1)
        exported = self.client.get(base + "/export.csv", params={"assigned_salesperson": "Sales A"})
        self.assertEqual(len(parse_csv(exported.content.decode("utf-8-sig"))), 1)
        self.assertTrue(self.client.get(base + "/duplicates").json()["items"])

    def test_types_signals_and_2000_candidate_capacity(self):
        self.assertEqual(len(INSTITUTION_TYPES), 22)
        self.assertEqual(len(SALES_SIGNALS), 15)
        records = [self.lead(i, institution_type=INSTITUTION_TYPES[i % 22], founded_year=1900, opened_year=2024, sales_signal=SALES_SIGNALS[i % 15]) for i in range(2000)]
        self.assertEqual(self.repo.import_records(records)["created"], 2000)
        self.assertEqual(self.repo.import_records(records)["duplicates"], 2000)
        self.assertEqual(len(parse_csv(export_csv(self.repo.export_records()).decode("utf-8-sig"))), 2000)
        self.assertEqual(self.repo.list(query="Institution 1999")["total"], 1)


if __name__ == "__main__":
    unittest.main()
