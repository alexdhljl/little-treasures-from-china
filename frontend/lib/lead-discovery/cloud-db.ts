import { neon } from "@neondatabase/serverless";

export type CloudSql = (query: string, params?: unknown[]) => Promise<unknown[]>;

export const cloudDatabaseVariable = "LEAD_DISCOVERY_DATABASE_URL";

export function hasCloudLeadDatabase() {
  return Boolean(process.env[cloudDatabaseVariable]);
}

export function cloudSql(): CloudSql {
  const url = process.env[cloudDatabaseVariable];
  if (!url) throw new Error(`Missing ${cloudDatabaseVariable}; this Preview has no Lead Discovery database.`);
  const raw = neon(url);
  return (query, params = []) => raw.query(query, params);
}

let initialized: Promise<void> | undefined;

/** Idempotent initial schema migration for the isolated Preview database. */
export function ensureLeadSchema() {
  if (!initialized) initialized = (async () => {
    const sql = cloudSql();
    await sql(`CREATE TABLE IF NOT EXISTS lead_institutions (
      id uuid PRIMARY KEY,
      institution_name text,
      institution_type text,
      website text,
      domain text,
      city text,
      state text,
      country text,
      phone text,
      email text,
      contact_page text,
      source_url text,
      source_type text,
      founded_year integer,
      opened_year integer,
      sales_signal text,
      reason_to_contact text,
      assigned_salesperson text,
      status text NOT NULL DEFAULT 'new',
      notes text,
      verification_status text NOT NULL DEFAULT 'pending',
      duplicate_reason text,
      payload jsonb NOT NULL,
      revision integer NOT NULL DEFAULT 1,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
    await sql(`CREATE TABLE IF NOT EXISTS lead_identities (
      kind text NOT NULL,
      value text NOT NULL,
      institution_id uuid NOT NULL REFERENCES lead_institutions(id) ON DELETE CASCADE,
      PRIMARY KEY (kind, value)
    )`);
    await sql(`CREATE INDEX IF NOT EXISTS lead_institutions_assignment_idx
      ON lead_institutions (verification_status, assigned_salesperson, status)`);
    await sql(`CREATE TABLE IF NOT EXISTS lead_duplicate_events (
      fingerprint text PRIMARY KEY,
      institution_id uuid NOT NULL REFERENCES lead_institutions(id) ON DELETE CASCADE,
      reason text NOT NULL,
      needs_review boolean NOT NULL,
      incoming jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
  })();
  return initialized;
}
