# Phase 3C.1 AI enrichment

Lead Discovery calls a provider-neutral enrichment interface. The initial adapter is DeepSeek, selected only when server-side `DEEPSEEK_API_KEY` exists; `DEEPSEEK_MODEL` defaults to `deepseek-chat`. No browser environment variable contains provider credentials.

Enrichment accepts only supplied source text and URLs. Its validated JSON is stored separately from authoritative leads with provider, model, source hash, schema version and timestamp. AI output never changes review state, approval, contacts, URLs or source evidence. Identical content/model/schema requests reuse the stored result.

The adapter limits source text to 24,000 characters, output to 900 tokens, has a 20-second timeout and makes no retries, loops, background work or batch processing. Missing keys leave the application usable and report AI as unavailable. A real API validation requires the owner to configure `DEEPSEEK_API_KEY` in Preview; none was made in this change.
