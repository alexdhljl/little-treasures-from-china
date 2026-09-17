from __future__ import annotations

import json
import os
from enum import Enum
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

try:
    from openai import AsyncOpenAI
except ImportError:  # Allows local development before installing the SDK.
    AsyncOpenAI = None

try:
    from anthropic import AsyncAnthropic
except ImportError:  # Allows local development before installing the SDK.
    AsyncAnthropic = None


router = APIRouter(prefix="/api/v1/crm", tags=["crm"])


class EmailTone(str, Enum):
    museum = "museum"
    university = "university"
    corporate = "corporate"
    zoo_aquarium = "zoo_aquarium"


class GenerateDraftRequest(BaseModel):
    institution_id: str | None = None
    institution_name: str = Field(min_length=1)
    category: str = Field(min_length=1)
    collection_theme_details: list[str] = Field(default_factory=list)
    target_contact_title: str | None = None
    product_type: str = Field(min_length=1)
    tone: EmailTone


class GenerateDraftResponse(BaseModel):
    subject: str
    body: str
    tone: EmailTone
    provider: str
    safety_note: str = "Draft only. Human review is required before sending or syncing."
    metadata: dict[str, Any] = Field(default_factory=dict)


TONE_GUIDANCE = {
    EmailTone.museum: (
        "Write for a museum or cultural institution. Emphasize historical/artistic resonance, "
        "gift shop retail margins, visual storytelling, exhibition relevance, and tasteful visitor souvenirs."
    ),
    EmailTone.university: (
        "Write for a university buyer. Emphasize alumni engagement, campus bookstore inventory, "
        "school spirit, admissions/events gifts, and memorable donor or reunion merchandise."
    ),
    EmailTone.corporate: (
        "Write for a corporate buyer. Emphasize employee experience, premium customized executive gifts, "
        "brand collaboration, client appreciation, and limited-run campaign merchandise."
    ),
    EmailTone.zoo_aquarium: (
        "Write for a zoo or aquarium buyer. Emphasize wildlife conservation themes, family-friendly "
        "custom merchandise, education programs, and memorable retail products for visitors."
    ),
}


SYSTEM_PROMPT = """You are a senior B2B sales copywriter for a boutique cultural merchandise design studio.

Create one polished cold email draft for a human sales user to review. Never claim the email was sent.
Never include fake facts, fake names, fake exhibitions, fake pricing, or unsupported metrics.
Use only the supplied institution context. If context is thin, stay specific to category and product type.

The email must:
- Be concise: 120-180 words.
- Sound premium, warm, and credible.
- Include a specific reason for relevance based on the supplied collection/theme details.
- Mention the product type naturally.
- Include one low-pressure call to action.
- Avoid spammy phrasing, exaggerated guarantees, and aggressive urgency.
- Return valid JSON only with keys: subject, body.
"""


@router.post("/generate-draft", response_model=GenerateDraftResponse)
async def generate_email_draft(request: GenerateDraftRequest) -> GenerateDraftResponse:
    payload = {
        "institution_name": request.institution_name,
        "category": request.category,
        "collection_theme_details": request.collection_theme_details,
        "target_contact_title": request.target_contact_title or "relevant retail, procurement, or partnership lead",
        "product_type": request.product_type,
        "tone": request.tone.value,
        "tone_guidance": TONE_GUIDANCE[request.tone],
        "human_in_the_loop_constraint": "Generate an editable draft only. Do not send email.",
    }

    if os.getenv("OPENAI_API_KEY") and AsyncOpenAI is not None:
        return await _generate_with_openai(request, payload)

    if os.getenv("ANTHROPIC_API_KEY") and AsyncAnthropic is not None:
        return await _generate_with_anthropic(request, payload)

    fallback = _local_fallback_draft(request)
    return GenerateDraftResponse(
        subject=fallback["subject"],
        body=fallback["body"],
        tone=request.tone,
        provider="local_fallback",
        metadata={"institution_id": request.institution_id, "api_provider_configured": False},
    )


async def _generate_with_openai(
    request: GenerateDraftRequest,
    payload: dict[str, Any],
) -> GenerateDraftResponse:
    if AsyncOpenAI is None:
        raise HTTPException(status_code=500, detail="OpenAI SDK is not installed.")

    client = AsyncOpenAI()
    model = os.getenv("OPENAI_EMAIL_MODEL", "gpt-4.1-mini")

    try:
        response = await client.responses.create(
            model=model,
            input=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        "Generate the email draft from this CRM context:\n"
                        f"{json.dumps(payload, ensure_ascii=False, indent=2)}"
                    ),
                },
            ],
            text={
                "format": {
                    "type": "json_schema",
                    "name": "email_draft",
                    "schema": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "subject": {"type": "string"},
                            "body": {"type": "string"},
                        },
                        "required": ["subject", "body"],
                    },
                }
            },
        )
        draft = json.loads(response.output_text)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"OpenAI draft generation failed: {exc}") from exc

    return GenerateDraftResponse(
        subject=draft["subject"],
        body=draft["body"],
        tone=request.tone,
        provider="openai",
        metadata={"institution_id": request.institution_id, "model": model},
    )


async def _generate_with_anthropic(
    request: GenerateDraftRequest,
    payload: dict[str, Any],
) -> GenerateDraftResponse:
    if AsyncAnthropic is None:
        raise HTTPException(status_code=500, detail="Anthropic SDK is not installed.")

    client = AsyncAnthropic()
    model = os.getenv("ANTHROPIC_EMAIL_MODEL", "claude-3-5-sonnet-latest")

    try:
        response = await client.messages.create(
            model=model,
            max_tokens=700,
            temperature=0.4,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Generate valid JSON only with keys subject and body from this CRM context:\n"
                        f"{json.dumps(payload, ensure_ascii=False, indent=2)}"
                    ),
                }
            ],
        )
        text = "".join(block.text for block in response.content if getattr(block, "type", "") == "text")
        draft = json.loads(text)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Anthropic draft generation failed: {exc}") from exc

    return GenerateDraftResponse(
        subject=draft["subject"],
        body=draft["body"],
        tone=request.tone,
        provider="anthropic",
        metadata={"institution_id": request.institution_id, "model": model},
    )


def _local_fallback_draft(request: GenerateDraftRequest) -> dict[str, str]:
    theme = ", ".join(request.collection_theme_details[:3]) or "your visitor and community programs"
    contact_title = request.target_contact_title or "your retail and partnerships team"

    openers = {
        EmailTone.museum: (
            f"I noticed {request.institution_name}'s connection to {theme}, and thought there may be "
            "a natural fit for a small, high-margin retail collaboration."
        ),
        EmailTone.university: (
            f"I noticed {request.institution_name}'s focus around {theme}, and thought this could translate "
            "well into alumni, bookstore, and campus event merchandise."
        ),
        EmailTone.corporate: (
            f"I noticed {request.institution_name}'s work around {theme}, and thought there may be room "
            "for a premium custom gifting concept tied to your brand experience."
        ),
        EmailTone.zoo_aquarium: (
            f"I noticed {request.institution_name}'s connection to {theme}, and thought it could inspire "
            "family-friendly merchandise with a conservation-minded story."
        ),
    }

    body = (
        f"Hi {contact_title},\n\n"
        f"{openers[request.tone]}\n\n"
        f"Our studio designs custom cultural merchandise, including {request.product_type}, for institutions "
        "that want products with a stronger visual story than standard souvenir inventory. We usually start "
        "with a landmark, collection theme, mascot, or seasonal program, then develop a polished retail-ready "
        "concept that can work for gift shops, events, donor moments, or limited campaigns.\n\n"
        "Would it be worth a brief conversation to see whether a custom concept could fit one of your upcoming "
        "retail or engagement priorities?\n\n"
        "Best,\n"
        "[Your Name]"
    )

    return {
        "subject": f"Custom {request.product_type} idea for {request.institution_name}",
        "body": body,
    }
