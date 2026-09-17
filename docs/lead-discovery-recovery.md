# Lead Discovery recovery — Phase 1

Recovered on 2026-09-17 on branch `codex/lead-discovery-recovery`.

## Boundaries

- `/lead-discovery` renders the original Cultural Commerce Database dashboard.
- `/`, `/en`, the storefront pages, shared layout, styles, middleware and package dependencies were not edited.
- The active dashboard is `frontend/components/lead-discovery/DashboardView.tsx`.
- Its seed files are in `frontend/data/lead-discovery/`; display-only signal adaptation is in `frontend/lib/lead-discovery/seed-data.ts`.
- Original dashboard, seed files, crawler, CRM helpers and export script are retained and tracked. The original CRM sidebar is preserved only; no new integration or sending functionality was enabled.
- This is an isolated route/module in the existing Next.js application, not a separate deployment or package.
- No new crawl, outreach, production deployment or push was performed.

## Backup

`_backups/lead-discovery-recovery-20260917-154747/RECOVERY_MANIFEST.md`

The manifest lists 105 copied files with original and backup paths, file sizes, SHA256 hashes and timestamps. Every copied file was hash-verified. All original `frontend/data/`, `backend/` (including existing caches), the dashboard and keyword-matching project files were copied, not moved. The backup directory is excluded from Git.

`tracked-baseline.json` and `git-status-before.txt` record the pre-recovery working tree. A final hash comparison found no changes to existing tracked files other than `.gitignore`. The pre-existing storefront edits remain uncommitted.

## Local startup

Frontend, using the existing installed dependencies:

```powershell
cd "D:\C_Drive_Moved\Projects\博物馆文创\frontend"
npm run dev -- --hostname 127.0.0.1 --port 3000
```

- Lead Discovery: http://localhost:3000/lead-discovery
- Storefront: http://localhost:3000/en

Backend, in an environment with the packages from `backend/requirements.txt`:

```powershell
cd "D:\C_Drive_Moved\Projects\博物馆文创\backend"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

- Health: http://127.0.0.1:8000/health
- API documentation: http://127.0.0.1:8000/docs
- The dashboard reads seeds locally and opens without the backend or paid API keys.

## Data and behavior

- Existing TS and JSON contain the same 100 records; copies are byte-identical to the originals.
- Original minimum-score filter is 80, showing 52 records initially. Set it to 0 to see all 100.
- The existing detail drawer is retained. `Confidence score` uses the original score; `Online store detected (existing seed data).` is shown only when the seed has an online-store URL. This is not a new crawl or live verification.
- Missing wholesale links remain visibly missing. The original procurement fallback to the contact page is retained.
- Dashboard edits remain React state, as before; refreshing resets these local changes.
- Backend crawl results go to `backend/data/leads.json`, which is ignored and absent before recovery. Backend results are not the frontend seed store.

## Backend preserved

- `GET /health`
- `GET /api/v1/leads`
- `POST /api/v1/leads/discover-targets`
- `POST /api/v1/leads/discover-and-crawl`
- `POST /api/v1/leads/crawl`
- `POST /api/v1/leads/crawl-batch`
- `GET /api/v1/leads/daily-update` (existing route can initiate crawling; not invoked)
- `POST /api/v1/crm/generate-draft`
- `POST /scraper/crawl`

Discovery engine, scoring engine, `seed_targets.json` and `discovery_sources.json` are unchanged. Search providers are selected through `SERPAPI_API_KEY` or `BING_SEARCH_API_KEY`; without keys the engine returns a marked query plan. Provider code presence does not establish current external provider availability; no paid or live search was tested.

## Verification

- Browser: `/lead-discovery` returns 200; all 100 cards are accessible after clearing the score filter.
- Searched and opened MoMA, Art Institute of Chicago and J. Paul Getty Museum. All required detail labels and original links were checked.
- Browser: `/en` returns 200 and renders Auctus Heritage; `/` still redirects to `/en`. No page or console errors in the unrestricted browser check.
- Browser screenshots and JSON evidence are in the ignored backup directory.
- Global TypeScript check has a pre-existing failure at `frontend/app/[locale]/[section]/page.tsx:159`: missing `siteConfig`. That file is unchanged by recovery. No recovery-module TypeScript errors remain.
- All 9 backend Python files pass syntax parsing. The unchanged scoring engine produces the online-store signal for all 3 named museum seeds. Configuration contains 4 crawler seeds and 5 discovery phases.
- Backend startup initially blocked: the available Python runtime lacks FastAPI, Uvicorn, HTTPX and BeautifulSoup. Installing a project-local environment requires the user's answer to the pending installation question.

## Git and secrets

Source/config allowlists replace the broad backend and seed-directory exclusions. Environments, caches, runtime results, backups and credential files remain ignored. Only recovery paths are staged; pre-existing storefront modifications are excluded.

Heuristic scanning of tracked source and recovery candidates found no embedded secrets. Existing ignored `.env.local` files contain populated service-role/OIDC credentials; values were not printed, copied into source or staged. `frontend/.env.example` has no populated secret and its pre-existing modification is excluded from this commit.
