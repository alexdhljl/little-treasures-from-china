from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Any

from app.api.leads import BatchCrawlTarget, CrawlLeadRequest, crawl_and_score_lead


class DailyCrawler:
    """Small MVP scheduler target for daily lead discovery.

    In production this should run from Celery Beat or a hosted cron job. For the
    local MVP it can be called by a CLI, a cron task, or a FastAPI background job.
    """

    def __init__(self, seed_path: Path | None = None) -> None:
        self.seed_path = seed_path or Path(__file__).resolve().parents[1] / "data" / "seed_targets.json"

    def load_targets(self) -> list[BatchCrawlTarget]:
        if not self.seed_path.exists():
            return []
        raw_targets: list[dict[str, Any]] = json.loads(self.seed_path.read_text(encoding="utf-8"))
        return [BatchCrawlTarget(**target) for target in raw_targets]

    async def run(self, max_targets: int = 25) -> dict[str, Any]:
        created = []
        failed = []
        for target in self.load_targets()[:max_targets]:
            try:
                result = await crawl_and_score_lead(CrawlLeadRequest(homepage_url=target.homepage_url, category=target.category))
                created.append(result["lead"])
                await asyncio.sleep(1.0)
            except Exception as exc:
                failed.append({"homepage_url": str(target.homepage_url), "error": str(exc)})

        return {
            "status": "complete",
            "created_or_updated": len(created),
            "failed": len(failed),
            "leads": created,
            "errors": failed,
        }
