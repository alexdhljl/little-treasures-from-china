# Lead Discovery Phase 3B: Cloud Preview Migration

## Scope and boundary

Phase 3B makes the existing Sales Lead List deployable as an isolated Vercel Preview service. It does not deploy production, invoke external discovery providers, crawl institutions, send email, or use the storefront's existing Supabase project.

The Vercel project has `frontend/` as its root. The historic FastAPI service lives in `backend/`, outside that root, so it remains a local developer service. Deploying that service would require a separate service/project and is deliberately out of scope for this preview migration.

## Preview architecture

The frontend uses `NEXT_PUBLIC_LEAD_DISCOVERY_API_BASE_URL` in local development. When this variable is absent in a non-local browser it uses same-origin Next.js route handlers instead:

- `/api/lead-discovery/sales/*`: isolated Sales Lead List API and CSV import/export
- `/api/lead-discovery/leads/discover-targets`: offline query-plan response only

The cloud handler refuses live crawling. Search keys and paid-provider calls are never required to load the Sales Lead List.

The intended Preview database is a separate Neon Postgres resource connected only to the Preview environment. Its connection string is supplied as the encrypted Vercel variable `LEAD_DISCOVERY_DATABASE_URL`. It must not point to the existing storefront Supabase database.

## Schema and migration

`frontend/db/lead-discovery/001_initial.sql` is the portable schema reference. At runtime, the Sales API applies the same idempotent schema setup before use. It creates `lead_institutions`, `lead_identities`, and `lead_duplicate_events`.

The schema preserves the Phase 3A fields used for review, assignment, status, notes, source provenance, normalized identity keys, revision-based edits, and duplicate evidence. It stores original normalized lead payloads as JSONB while keeping list and review fields in columns for querying. The Preview seed endpoint maps the existing `seed-leads.json`; it never regenerates the 100 records or manufactures contacts.

## Readiness findings

- Cloud-ready after this change: the Next.js UI, Lead Discovery pages, seed import, review and assignment UI, CSV export, same-origin sales routes, and offline discovery query plans.
- Local-only: FastAPI routes, local SQLite/database files, crawler/discovery engines, provider adapters, and developer-only start scripts.
- External provider behavior: no SerpAPI or Bing API request is made by the Preview route. Missing provider keys cannot prevent the page or seed data from loading.

## Required cloud verification

Before declaring the migration complete, create the isolated Preview Neon resource, then verify:

1. Preview deployment uses only the same-origin API.
2. `POST /api/lead-discovery/sales/import/seeds` creates 100 records and a repeat call reports duplicates.
3. MoMA, Art Institute of Chicago, and J. Paul Getty Museum appear in the list and open in the existing detail UI.
4. A review/status/note edit survives a Preview redeploy.
5. CSV export downloads expected records, no placeholder email is present, and no record is marked as a verified contact solely because it has no attributed public contact page.

## Operational safety

Never commit `.env*`, database URLs, API keys, credentials, or generated runtime data. Keep database environment variables Preview-only. The feature branch can be pushed only after the isolated database is present and the checks above pass; no merge to `main` and no production deployment is part of this phase.
