import type { Enrichment, EnrichmentInput, EnrichmentProvider } from "./provider";
const MAX_SOURCE = 24_000;
function validate(value: unknown): Enrichment {
  const v = value as Record<string, unknown>; if (!v || typeof v !== "object" || !v.relevance || !v.gift_shop_signal || !Array.isArray(v.sales_signals) || !Array.isArray(v.recommended_product_angles) || !Array.isArray(v.uncertainties)) throw new Error("Malformed AI enrichment JSON");
  const confidence = (x: unknown) => typeof x === "number" && x >= 0 && x <= 1;
  if (!confidence((v.relevance as Record<string, unknown>).score) || !confidence((v.gift_shop_signal as Record<string, unknown>).confidence)) throw new Error("Invalid AI confidence");
  return v as unknown as Enrichment;
}
export function deepseekProvider(): EnrichmentProvider | null {
  const key = process.env.DEEPSEEK_API_KEY; if (!key) return null; const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  return { name: "deepseek", model, async enrich(input: EnrichmentInput) {
    if (input.sourceText.length > MAX_SOURCE) throw new Error("Source text exceeds AI safety limit");
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 20_000);
    try { const response = await fetch("https://api.deepseek.com/chat/completions", { method: "POST", signal: controller.signal, headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, temperature: 0, max_tokens: 900, response_format: { type: "json_object" }, messages: [{ role: "system", content: "Return JSON only. Analyze supplied public text; do not invent contacts, URLs, dates, addresses, or unsupported facts. AI analysis never approves a lead." }, { role: "user", content: JSON.stringify(input) }] }) }); if (!response.ok) throw new Error(`AI provider unavailable (${response.status})`); const body = await response.json(); return validate(JSON.parse(body.choices?.[0]?.message?.content || "")); } finally { clearTimeout(timer); }
  } };
}
