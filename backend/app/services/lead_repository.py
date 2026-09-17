from __future__ import annotations

import json
from pathlib import Path
from typing import Any


class LeadRepository:
    def __init__(self, path: Path | None = None) -> None:
        self.path = path or Path(__file__).resolve().parents[2] / "data" / "leads.json"
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def list_leads(self) -> list[dict[str, Any]]:
        if not self.path.exists():
            return []
        return json.loads(self.path.read_text(encoding="utf-8"))

    def upsert_lead(self, lead: dict[str, Any]) -> None:
        leads = self.list_leads()
        existing_index = next((index for index, item in enumerate(leads) if item.get("id") == lead.get("id")), None)
        if existing_index is None:
            leads.insert(0, lead)
        else:
            leads[existing_index] = lead
        self.path.write_text(json.dumps(leads, ensure_ascii=False, indent=2), encoding="utf-8")
