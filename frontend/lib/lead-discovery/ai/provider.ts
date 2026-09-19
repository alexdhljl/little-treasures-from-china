export type EnrichmentInput = { leadId: string; institutionName: string; sourceUrls: string[]; sourceText: string };
export type Enrichment = { institution_type: string | null; gift_shop_signal: { value: boolean | null; confidence: number; evidence: string | null }; sales_signals: { type: string; confidence: number; evidence: string }[]; relevance: { score: number; reason: string }; reason_to_contact: string | null; recommended_product_angles: string[]; uncertainties: string[] };
export type EnrichmentProvider = { name: string; model: string; enrich(input: EnrichmentInput): Promise<Enrichment> };
export const enrichmentSchemaVersion = "1.0";
export function fingerprint(input: EnrichmentInput, provider: string, model: string) { return crypto.createHash("sha256").update(JSON.stringify([input.sourceText, input.sourceUrls, provider, model, enrichmentSchemaVersion])).digest("hex"); }
import crypto from "node:crypto";
