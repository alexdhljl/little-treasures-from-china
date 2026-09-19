"""Institution-first contract; contact presence never gates eligibility."""
import re
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from app.services.institution_normalization import normalized_website

INSTITUTION_TYPES = [
    "Museum", "Art Museum", "Gallery / Art Center", "Cultural Center", "Cultural Nonprofit",
    "Tourism Company", "Destination Management Organization / DMO", "Tourist Attraction",
    "Park", "Theme Park", "Zoo", "Aquarium", "Botanical Garden", "Historic Site",
    "Heritage Organization", "Visitor Center", "University", "College", "School",
    "University Bookstore", "Festival / Cultural Event", "Other",
]
SALES_SIGNALS = ["Founded within approximately 5 years", "Newly opened", "New venue", "Reopened",
                 "Expansion", "Rebrand", "New attraction", "New visitor center", "New exhibition program",
                 "New mascot / IP", "New gift shop", "New retail program", "New tourism project",
                 "New campus", "Anniversary"]
TRUSTED_SOURCE_TYPES = {"official_website", "official_store", "contact_page", "public_directory",
                        "government", "open_data", "manual_public_source"}


class InstitutionLeadInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    institution_name: str | None = Field(default=None, max_length=500)
    institution_type: str | None = Field(default=None, max_length=160)
    website: str | None = Field(default=None, max_length=2048)
    domain: str | None = None
    city: str | None = Field(default=None, max_length=200)
    state: str | None = Field(default=None, max_length=200)
    country: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=100)
    email: str | None = Field(default=None, max_length=320)
    contact_page: str | None = Field(default=None, max_length=2048)
    source_url: str | None = Field(default=None, max_length=2048)
    source_type: str | None = Field(default=None, max_length=100)
    founded_year: int | None = Field(default=None, ge=1, le=2200)
    opened_year: int | None = Field(default=None, ge=1, le=2200)
    sales_signal: str | None = Field(default=None, max_length=2000)
    reason_to_contact: str | None = Field(default=None, max_length=4000)
    assigned_salesperson: str | None = Field(default=None, max_length=100)
    status: Literal["new", "reviewing", "ready", "contacted", "follow_up", "qualified", "disqualified", "archived"] = "new"
    notes: str | None = Field(default=None, max_length=10000)
    review_status: Literal["pending", "approved"] = "pending"

    @field_validator("*", mode="before")
    @classmethod
    def blank_to_none(cls, value):
        return None if isinstance(value, str) and not value.strip() else value

    @field_validator("website", "source_url", "contact_page")
    @classmethod
    def valid_public_url(cls, value):
        if value:
            normalized_website(value)
            return value if "://" in value else "https://" + value
        return value

    @field_validator("email")
    @classmethod
    def public_email_only(cls, value):
        if not value:
            return None
        if re.match(r"^partnerships\+[0-9a-f]{8}@", value, re.I):
            return None  # Remove the exact historical synthetic pattern.
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
            raise ValueError("Invalid email format")
        return value

    @model_validator(mode="after")
    def require_contact_source(self):
        if not (self.source_url or self.contact_page):
            self.email = None
            self.phone = None
        return self


def eligibility(record: dict) -> list[str]:
    missing = []
    if not record.get("institution_name"):
        missing.append("institution_name")
    if not (record.get("city") or record.get("state")):
        missing.append("city_or_state")
    if not (record.get("website") or (record.get("source_url") and record.get("source_type") in TRUSTED_SOURCE_TYPES)):
        missing.append("website_or_trusted_public_source")
    return missing


def timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()


def seed_to_input(row: dict) -> InstitutionLeadInput:
    subtype = row.get("subcategory") or ""
    category = row.get("category", "")
    lower = subtype.lower()
    kind = next((value for word, value in [
        ("bookstore", "University Bookstore"), ("campus store", "University Bookstore"),
        ("art museum", "Art Museum"), ("aquarium", "Aquarium"), ("zoo", "Zoo"),
        ("botanical", "Botanical Garden"), ("historic", "Historic Site"),
        ("festival", "Festival / Cultural Event"), ("university", "University"),
        ("museum", "Museum"), ("nonprofit", "Cultural Nonprofit"),
    ] if word in lower), None)
    if kind is None:
        kind = {"Museums & Cultural Institutions": "Museum", "Tourism & Attractions": "Tourist Attraction",
                "Universities & Schools": "University", "Nonprofit Organizations": "Cultural Nonprofit",
                "Influencers & Events": "Festival / Cultural Event"}.get(category, "Other")
    return InstitutionLeadInput(
        institution_name=row.get("name"), institution_type=kind, website=row.get("website_url"),
        city=row.get("city"), state=row.get("state"), country=row.get("country"), phone=row.get("phone"),
        email=row.get("correct_business_email") or row.get("retail_contact_email") or row.get("general_email"),
        contact_page=row.get("contact_page_url"), source_url=row.get("source_url"), source_type=row.get("source_type"),
        reason_to_contact=row.get("recommended_product_angle"), notes=row.get("evidence_notes"),
    )
