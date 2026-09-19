-- Phase 3C: apply after 001_initial.sql, only to LEAD_DISCOVERY_DATABASE_URL.
CREATE TABLE IF NOT EXISTS lead_audit_log (
  id bigserial PRIMARY KEY,
  lead_id uuid REFERENCES lead_institutions(id) ON DELETE SET NULL,
  action text NOT NULL,
  previous_value jsonb,
  new_value jsonb,
  actor text,
  context text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lead_audit_log_created_idx ON lead_audit_log(created_at DESC);
