from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from typing import Any
from app.services.scraper_engine import CONTACT_TITLE_PATTERNS


ScoreRecord = dict[str, Any]


WEIGHTS = {
    "museum_fit": 0.15,
    "gift_shop": 0.20,
    "wholesale_potential": 0.15,
    "cultural_heritage_fit": 0.20,
    "corporate_tourism_fit": 0.15,
    "partnership_probability": 0.15,
}


ASIAN_HERITAGE_KEYWORDS = re.compile(
    r"\b("
    r"asian|asia|chinese|china|japanese|japan|korean|korea|taiwan|hong kong|"
    r"silk road|buddhist|buddhism|dynasty|calligraphy|porcelain|ceramic|"
    r"jade|tea culture|lunar new year|dragon|terracotta|forbidden city|"
    r"great wall|landmark|heritage|world culture|global culture"
    r")\b",
    re.I,
)

MUSEUM_FIT_KEYWORDS = re.compile(
    r"\b("
    r"museum|gallery|historic|history|heritage|landmark|art|architecture|"
    r"botanical|garden|zoo|aquarium|cultural center|exhibition|collection"
    r")\b",
    re.I,
)

STORE_KEYWORDS = re.compile(
    r"\b("
    r"gift shop|museum store|online store|shopify|woocommerce|ecommerce|"
    r"e-commerce|souvenir|merchandise|retail|bookstore|campus store"
    r")\b",
    re.I,
)

WHOLESALE_KEYWORDS = re.compile(
    r"\b(wholesale|vendor application|supplier|procurement|bulk order|retail partner|distributor)\b",
    re.I,
)

CORPORATE_TOURISM_KEYWORDS = re.compile(
    r"\b("
    r"tourism|visitor center|destination|attraction|theme park|national park|"
    r"state park|conference|events|corporate gift|employee gift|fortune 500|"
    r"hospitality|resort|high traffic"
    r")\b",
    re.I,
)

PARTNERSHIP_KEYWORDS = re.compile(
    r"\b(partnership|buyer|retail director|gift shop manager|procurement|merchandise buyer|"
    r"museum store director|visitor experience director|linkedin)\b",
    re.I,
)


@dataclass(frozen=True)
class ScoreBreakdown:
    dimension: str
    weight: float
    raw_score: float
    weighted_score: float
    signals: list[str] = field(default_factory=list)
    penalties: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class LeadScoreResult:
    overall_score: float
    base_score_before_penalties: float
    penalty_multiplier: float
    breakdown: list[ScoreBreakdown]
    blockers: list[str]
    recommended_action: str


class LeadScoringEngine:
    """Deterministic opportunity scoring for enriched B2B lead records.

    Expected input is a dict shaped like the `institutions` record plus optional
    related lists: `contacts`, `target_pages`, and `scraped_text`.
    """

    def score(self, institution: ScoreRecord) -> LeadScoreResult:
        breakdown = [
            self._museum_fit_score(institution),
            self._gift_shop_score(institution),
            self._wholesale_potential_score(institution),
            self._cultural_heritage_score(institution),
            self._corporate_tourism_score(institution),
            self._partnership_probability_score(institution),
        ]

        base_score = sum(item.weighted_score for item in breakdown)
        blockers = self._critical_blockers(institution)
        penalty_multiplier = self._penalty_multiplier(blockers)
        overall = round(max(0, min(100, base_score * penalty_multiplier)), 2)

        return LeadScoreResult(
            overall_score=overall,
            base_score_before_penalties=round(base_score, 2),
            penalty_multiplier=penalty_multiplier,
            breakdown=breakdown,
            blockers=blockers,
            recommended_action=self._recommended_action(overall, blockers),
        )

    def _museum_fit_score(self, record: ScoreRecord) -> ScoreBreakdown:
        score = 0.0
        signals: list[str] = []
        penalties: list[str] = []
        text = self._text_blob(record)
        category = str(record.get("category") or "").lower()
        visitors = self._number(record.get("estimated_annual_visitors"))

        if category in {"museum", "art_gallery", "historic_site", "botanical_garden", "zoo", "aquarium"}:
            score += 35
            signals.append("Institution category matches cultural/tourism buyer profile.")
        if MUSEUM_FIT_KEYWORDS.search(text):
            score += 25
            signals.append("Website text contains museum, art, heritage, or exhibition signals.")
        if visitors >= 1_000_000:
            score += 25
            signals.append("Very high annual visitor volume.")
        elif visitors >= 250_000:
            score += 18
            signals.append("Strong annual visitor volume.")
        elif visitors >= 75_000:
            score += 10
            signals.append("Moderate annual visitor volume.")
        else:
            penalties.append("Visitor volume is missing or low.")
        if self._bool(record, "has_children_programs") or self._bool(record, "has_traveling_exhibitions"):
            score += 15
            signals.append("Programs or traveling exhibitions increase merchandise relevance.")

        return self._breakdown("museum_fit", score, signals, penalties)

    def _gift_shop_score(self, record: ScoreRecord) -> ScoreBreakdown:
        score = 0.0
        signals: list[str] = []
        penalties: list[str] = []
        text = self._text_blob(record)

        if self._bool(record, "has_museum_store") or record.get("gift_shop_url"):
            score += 35
            signals.append("Physical gift shop or store page detected.")
        if self._bool(record, "has_online_store") or record.get("online_store_url"):
            score += 30
            signals.append("Online store detected.")
        if re.search(r"\b(shopify|myshopify|woocommerce|squarespace commerce|bigcommerce)\b", text, re.I):
            score += 20
            signals.append("Commerce platform signal detected.")
        if STORE_KEYWORDS.search(text):
            score += 15
            signals.append("Retail, merchandise, or store keywords found.")
        if score == 0:
            penalties.append("No store, ecommerce, or merchandise signals found.")

        return self._breakdown("gift_shop", score, signals, penalties)

    def _wholesale_potential_score(self, record: ScoreRecord) -> ScoreBreakdown:
        score = 0.0
        signals: list[str] = []
        penalties: list[str] = []
        text = self._text_blob(record)

        if self._bool(record, "has_wholesale_program") or record.get("wholesale_url"):
            score += 45
            signals.append("Wholesale program detected.")
        if self._bool(record, "accepts_vendor_applications") or record.get("vendor_application_url"):
            score += 35
            signals.append("Vendor application or supplier page detected.")
        if WHOLESALE_KEYWORDS.search(text):
            score += 20
            signals.append("Wholesale, vendor, procurement, or bulk order keywords found.")
        if score == 0:
            penalties.append("No explicit wholesale or vendor path detected.")

        return self._breakdown("wholesale_potential", score, signals, penalties)

    def _cultural_heritage_score(self, record: ScoreRecord) -> ScoreBreakdown:
        score = 0.0
        signals: list[str] = []
        penalties: list[str] = []
        text = self._text_blob(record)

        for field_name, points, label in [
            ("has_asian_collection", 25, "Asian collection flag is present."),
            ("has_chinese_collection", 30, "Chinese collection flag is present."),
            ("has_global_culture_collection", 15, "Global culture collection flag is present."),
            ("has_landmark_or_architecture_theme", 15, "Landmark or architecture theme detected."),
        ]:
            if self._bool(record, field_name):
                score += points
                signals.append(label)

        keyword_hits = len(set(match.group(0).lower() for match in ASIAN_HERITAGE_KEYWORDS.finditer(text)))
        if keyword_hits >= 5:
            score += 25
            signals.append("Multiple Asian, Chinese, heritage, or landmark keywords detected.")
        elif keyword_hits >= 2:
            score += 15
            signals.append("Some cultural heritage keywords detected.")
        elif keyword_hits == 1:
            score += 8
            signals.append("One cultural heritage keyword detected.")
        else:
            penalties.append("No strong Asian, Chinese, global heritage, or landmark signals found.")

        return self._breakdown("cultural_heritage_fit", score, signals, penalties)

    def _corporate_tourism_score(self, record: ScoreRecord) -> ScoreBreakdown:
        score = 0.0
        signals: list[str] = []
        penalties: list[str] = []
        text = self._text_blob(record)
        category = str(record.get("category") or "").lower()
        visitors = self._number(record.get("estimated_annual_visitors"))
        employees = self._number(record.get("employee_count"))
        fortune_rank = self._number(record.get("fortune_500_rank"))

        if category in {"tourism_attraction", "corporate", "university", "historic_site", "zoo", "aquarium"}:
            score += 20
            signals.append("Category has tourism, corporate, university, or attraction buying relevance.")
        if visitors >= 1_000_000:
            score += 30
            signals.append("Major tourist foot traffic.")
        elif visitors >= 250_000:
            score += 18
            signals.append("Meaningful tourist foot traffic.")
        if employees >= 10_000:
            score += 25
            signals.append("Large employee base supports corporate gifting potential.")
        elif employees >= 1_000:
            score += 15
            signals.append("Moderate employee base supports gifting potential.")
        if 1 <= fortune_rank <= 500:
            score += 25
            signals.append("Fortune 500 company signal.")
        if CORPORATE_TOURISM_KEYWORDS.search(text):
            score += 20
            signals.append("Corporate gifting, tourism, events, or attraction keywords found.")
        if score == 0:
            penalties.append("No corporate gifting or tourism volume signals found.")

        return self._breakdown("corporate_tourism_fit", score, signals, penalties)

    def _partnership_probability_score(self, record: ScoreRecord) -> ScoreBreakdown:
        score = 0.0
        signals: list[str] = []
        penalties: list[str] = []
        text = self._text_blob(record)
        contacts = record.get("contacts") or []

        direct_emails = [c for c in contacts if c.get("email") and not self._is_generic_email(c.get("email"))]
        generic_emails = [c for c in contacts if c.get("email") and self._is_generic_email(c.get("email"))]
        decision_makers = [
            c for c in contacts
            if c.get("is_decision_maker") or CONTACT_TITLE_PATTERNS.search(str(c.get("title") or c.get("title_hint") or ""))
        ]
        linkedin_contacts = [c for c in contacts if c.get("linkedin_url")]

        if direct_emails:
            score += 30
            signals.append("Direct non-generic email found.")
        elif generic_emails:
            score += 12
            signals.append("Generic public email found.")
        else:
            penalties.append("No usable email found.")
        if decision_makers:
            score += 30
            signals.append("Decision-maker title detected.")
        if linkedin_contacts or record.get("linkedin_company_url"):
            score += 20
            signals.append("LinkedIn contact or company profile found.")
        if PARTNERSHIP_KEYWORDS.search(text):
            score += 20
            signals.append("Partnership, buyer, retail, or procurement language found.")

        return self._breakdown("partnership_probability", score, signals, penalties)

    def _critical_blockers(self, record: ScoreRecord) -> list[str]:
        blockers: list[str] = []
        has_store = self._bool(record, "has_museum_store") or self._bool(record, "has_online_store") or bool(
            record.get("gift_shop_url") or record.get("online_store_url")
        )
        has_corporate_program = bool(
            record.get("corporate_gift_url")
            or record.get("events_url")
            or re.search(r"\b(corporate gift|employee gift|events|conference|bulk order)\b", self._text_blob(record), re.I)
        )
        contacts = record.get("contacts") or []

        if not has_store and not has_corporate_program:
            blockers.append("No gift shop, ecommerce store, event program, or corporate gifting signal.")
        if not contacts and not record.get("public_email"):
            blockers.append("No contact path available for outreach.")
        if record.get("status") in {"disqualified", "duplicate", "archived"}:
            blockers.append(f"Institution status is {record.get('status')}.")

        return blockers

    @staticmethod
    def _penalty_multiplier(blockers: list[str]) -> float:
        if not blockers:
            return 1.0
        return round(max(0.55, 1.0 - (0.15 * len(blockers))), 2)

    @staticmethod
    def _recommended_action(score: float, blockers: list[str]) -> str:
        if blockers and score < 45:
            return "Manual research before outreach"
        if score >= 80:
            return "High priority: prepare personalized draft"
        if score >= 65:
            return "Qualified: enrich contacts and add to outreach queue"
        if score >= 45:
            return "Nurture: review fit and missing data"
        return "Low priority: park or disqualify"

    @staticmethod
    def _breakdown(dimension: str, raw_score: float, signals: list[str], penalties: list[str]) -> ScoreBreakdown:
        capped = round(max(0, min(100, raw_score)), 2)
        weight = WEIGHTS[dimension]
        return ScoreBreakdown(
            dimension=dimension,
            weight=weight,
            raw_score=capped,
            weighted_score=round(capped * weight, 2),
            signals=signals,
            penalties=penalties,
        )

    @staticmethod
    def _bool(record: ScoreRecord, key: str) -> bool:
        value = record.get(key)
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.strip().lower() in {"true", "yes", "1", "y"}
        return bool(value)

    @staticmethod
    def _number(value: Any) -> float:
        if value is None or value == "":
            return 0.0
        if isinstance(value, (int, float)) and not math.isnan(float(value)):
            return float(value)
        cleaned = re.sub(r"[^\d.]", "", str(value))
        return float(cleaned) if cleaned else 0.0

    @staticmethod
    def _is_generic_email(email: str | None) -> bool:
        if not email:
            return False
        local = email.split("@", 1)[0].lower()
        return local in {"info", "hello", "contact", "support", "admin", "sales", "store", "shop", "museum"}

    @staticmethod
    def _text_blob(record: ScoreRecord) -> str:
        text_fields = [
            "name",
            "description",
            "scraped_text",
            "collection_focus",
            "current_merchandise_keywords",
            "partnership_keywords",
            "procurement_keywords",
            "cultural_alignment_notes",
            "product_fit_notes",
            "museum_type",
            "museum_discipline",
        ]
        parts: list[str] = []
        for field_name in text_fields:
            value = record.get(field_name)
            if isinstance(value, list):
                parts.extend(str(item) for item in value)
            elif value:
                parts.append(str(value))

        for page in record.get("target_pages") or []:
            parts.append(str(page.get("url") or ""))
            parts.append(str(page.get("title") or ""))
            parts.append(str(page.get("page_type") or ""))

        for contact in record.get("contacts") or []:
            parts.append(str(contact.get("title") or ""))
            parts.append(str(contact.get("title_hint") or ""))
            parts.append(str(contact.get("department") or ""))

        return " ".join(parts)


if __name__ == "__main__":
    sample_record = {
        "name": "Example Asian Art Museum",
        "category": "museum",
        "estimated_annual_visitors": 425000,
        "has_museum_store": True,
        "has_online_store": True,
        "gift_shop_url": "https://example.org/shop",
        "vendor_application_url": "https://example.org/vendors",
        "has_asian_collection": True,
        "has_chinese_collection": True,
        "scraped_text": "Asian art collection, Chinese ceramics, museum store, vendor application, partnerships.",
        "contacts": [
            {
                "email": "buyer@example.org",
                "title": "Museum Store Director",
                "linkedin_url": "https://linkedin.com/in/example",
                "is_decision_maker": True,
            }
        ],
    }
    result = LeadScoringEngine().score(sample_record)
    print(result)
