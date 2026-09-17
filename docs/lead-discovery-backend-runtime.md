# Lead Discovery backend runtime restoration

Verified locally on 2026-09-17, branch `codex/lead-discovery-recovery`.

## Environment and dependencies

The user authorized installation only inside `backend/.venv`. Python 3.12.14 from the existing bundled runtime created that virtual environment. `include-system-site-packages = false`; all five direct runtime imports resolve inside `.venv`. No system Python or system packages were changed. Pip downloads used `--isolated --no-cache-dir --only-binary=:all:`.

The original `backend/requirements.txt` is unchanged. New `requirements-runtime.txt` selects only startup imports, within the minor-version series already specified by that file. `requirements-runtime.lock.txt` pins the verified direct and transitive resolution. Uvicorn's optional standard extras, Playwright, browsers and paid LLM SDKs were not installed; those SDK imports are already optional in the backend.

Virtual-environment bootstrap also supplied pip 25.0.1 inside `.venv`; it was not upgraded or installed system-wide.

| Package | Version |
|---|---|
| fastapi | 0.115.14 |
| uvicorn | 0.30.6 |
| httpx | 0.27.2 |
| beautifulsoup4 | 4.12.3 |
| pydantic | 2.8.2 |
| annotated-types | 0.8.0 |
| anyio | 4.15.1 |
| certifi | 2026.7.22 |
| click | 8.5.0 |
| h11 | 0.16.0 |
| httpcore | 1.0.9 |
| idna | 3.20 |
| pydantic_core | 2.20.1 |
| sniffio | 1.3.1 |
| soupsieve | 2.9.2 |
| starlette | 0.46.2 |
| typing_extensions | 4.16.0 |

## Reproduce

From the project root, after creating `backend/.venv` with a compatible Python 3.12:

```powershell
backend/.venv/Scripts/python.exe -m pip --isolated install --no-cache-dir -r backend/requirements-runtime.lock.txt
cd backend
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

The running verification process has empty `SERPAPI_API_KEY`, `BING_SEARCH_API_KEY`, `OPENAI_API_KEY` and `ANTHROPIC_API_KEY`, set only for that process. It does not load the storefront's `.env.local` files. The backend listens only on loopback.

## Verification results

- `pip check`: no broken requirements.
- Five regression tests pass: `.venv/Scripts/python.exe -B -m unittest discover -s tests -v` from `backend`.
- Regression tests prohibit outbound HTTP transports and mock the crawler with a failing sentinel, so an accidental provider request or crawl fails the test.
- `GET /health`, `/docs`, `/openapi.json`, `/api/v1/leads`, `/api/v1/leads/daily-update`: HTTP 200 against the running server. `/docs` serves Swagger HTML and the OpenAPI schema is valid; external Swagger CDN assets were not fetched during this check.
- `POST /api/v1/leads/discover-targets`: HTTP 200 for museums, universities, attractions, corporate and schools. Each returns `query_plan_no_api_key`, `requires_api_key_for_live_search: true` and a nonempty query plan.
- `POST /api/v1/leads/discover-and-crawl`: verified only with no keys; returns `blocked_needs_search_api_key` without crawling.
- `POST /api/v1/leads/crawl`: invalid URL returns HTTP 422 before execution. Successful crawling was intentionally not tested.
- Browser CORS preflight: HTTP 200. The actual dashboard's discovery button receives HTTP 200 from `127.0.0.1:8000` and displays the no-key query-plan message, rather than the backend-offline fallback.
- Browser still shows all 100 original seed cards with score filter 0; MoMA, Art Institute of Chicago and Getty details open after the backend response.
- Browser reports zero page/console errors and zero attempted external requests. Its route guard allowed only localhost and 127.0.0.1.
- No crawl data file was created. `GET /api/v1/leads` returns the empty runtime repository; the 100 frontend seeds intentionally remain separate, as in the original system.
- Backend stderr contains only normal startup messages, with no tracebacks.

The old query-plan deduplication collapses `discovery://` entries to one target per phase. This pre-existing behavior is recorded here, not changed during runtime recovery. Similarly, the previously recorded storefront `siteConfig` type error is outside this phase and unchanged.

An initial test harness blocked Windows asyncio's internal socket pair. That test-only guard was replaced with an HTTP-transport guard; all five tests then passed. No application code needed correction.

Evidence is under `_backups/lead-discovery-recovery-20260917-154747/`: `backend-live-verification.json`, `backend-browser-verification.json`, `backend-connected.png`, and backend logs. These are ignored, not committed.

## Git and external activity

`.venv`, runtime data and logs are ignored. This phase commits only minimal dependency manifests, their Git allowlist, offline regression tests and documentation. Original storefront modifications and untracked files are excluded.

Only public package downloads from PyPI were made. No search/provider API, paid API, customer crawl, mail, production mutation, deployment or push occurred. No secrets were added to source or the dependency lockfile.
