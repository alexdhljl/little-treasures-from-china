from __future__ import annotations

import asyncio
import json

from app.services.daily_crawler import DailyCrawler


async def main() -> None:
    result = await DailyCrawler().run()
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
