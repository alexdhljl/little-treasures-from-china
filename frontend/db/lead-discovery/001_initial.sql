-- Isolated Lead Discovery Preview schema. Run only against LEAD_DISCOVERY_DATABASE_URL.
-- The app's idempotent migration mirrors this schema for first Preview boot.
CREATE TABLE lead_institutions (
  id uuid PRIMARY KEY,
  institution_name text, institution_type text, website text, domain text,
  city text, state text, country text, phone text, email text, contact_page text,
  source_url text, source_type text, founded_year integer, opened_year integer,
  sales_signal text, reason_to_contact text, assigned_salesperson text,
  status text NOT NULL DEFAULT 'new', notes text,
  verification_status text NOT NULL DEFAULT 'pending', duplicate_reason text,
  payload jsonb NOT NULL, revision integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE lead_identities (kind text NOT NULL, value text NOT NULL, institution_id uuid NOT NULL REFERENCES lead_institutions(id) ON DELETE CASCADE, PRIMARY KEY(kind, value));
CREATE INDEX lead_institutions_assignment_idx ON lead_institutions (verification_status, assigned_salesperson, status);
CREATE TABLE lead_duplicate_events (fingerprint text PRIMARY KEY, institution_id uuid NOT NULL REFERENCES lead_institutions(id) ON DELETE CASCADE, reason text NOT NULL, needs_review boolean NOT NULL, incoming jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
