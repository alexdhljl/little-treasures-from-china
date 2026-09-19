CREATE TABLE IF NOT EXISTS lead_ai_enrichments (
 id bigserial PRIMARY KEY, lead_id uuid NOT NULL REFERENCES lead_institutions(id) ON DELETE CASCADE,
 provider text NOT NULL, model text NOT NULL, source_content_hash text NOT NULL, schema_version text NOT NULL,
 source_urls jsonb NOT NULL, enrichment jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), superseded_at timestamptz,
 UNIQUE(lead_id, provider, model, source_content_hash, schema_version)
);
