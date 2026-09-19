# Lead Discovery Phase 3C hardening

Preview reads remain behind Vercel Deployment Protection. Every mutation additionally requires the server-only `LEAD_DISCOVERY_WRITE_TOKEN`, supplied as `x-lead-discovery-write-token`; the UI keeps an authorized user's value only in `sessionStorage`. This is a lightweight Preview gate, not a production identity system: it has a shared token, no user accounts, and relies on Deployment Protection for read access.

`002_audit_log.sql` adds an append-only audit table. Imports, assignments, and lead review/status/note changes record timestamps, actor label, context, and before/after JSON without secrets. Recent entries are available to authorized Preview readers at `/api/lead-discovery/sales/audit`.

The sales API limits request bodies to 1 MB, imports to 2,000 rows, pagination to 500, salespeople to 50, assignment targets to 5,000, notes to 5,000 characters, and reason text to 1,000 characters. URLs, status values, approval evidence, CSV columns, and CSV export formula escaping remain validated. Runtime schema setup remains temporarily idempotent for Preview compatibility; `001_initial.sql` then `002_audit_log.sql` are the deterministic path for a future managed migration runner.

No discovery provider, crawler, email delivery, storefront database, main branch, or Production resource is used. A production rollout still needs real identity/role authorization, managed migrations, rate limiting shared across instances, an isolated Production database, and a capacity test database rather than the persistent Preview seed set.
