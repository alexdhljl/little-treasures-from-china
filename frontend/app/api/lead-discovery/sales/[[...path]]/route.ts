import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import seedRows from "@/data/lead-discovery/seed-leads.json";
import { cloudSql, ensureLeadSchema, hasCloudLeadDatabase, type CloudSql } from "@/lib/lead-discovery/cloud-db";
import { canMutateLeadDiscovery } from "@/lib/lead-discovery/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS = new Set(["new", "reviewing", "ready", "contacted", "follow_up", "qualified", "disqualified", "archived"]);
const TRUSTED = new Set(["official_website", "official_store", "contact_page", "public_directory", "government", "open_data", "manual_public_source"]);
const TYPES = ["Museum", "Art Museum", "Gallery / Art Center", "Cultural Center", "Cultural Nonprofit", "Tourism Company", "Destination Management Organization / DMO", "Tourist Attraction", "Park", "Theme Park", "Zoo", "Aquarium", "Botanical Garden", "Historic Site", "Heritage Organization", "Visitor Center", "University", "College", "School", "University Bookstore", "Festival / Cultural Event", "Other"];
const SIGNALS = ["Founded within approximately 5 years", "Newly opened", "New venue", "Reopened", "Expansion", "Rebrand", "New attraction", "New visitor center", "New exhibition program", "New mascot / IP", "New gift shop", "New retail program", "New tourism project", "New campus", "Anniversary"];
type LeadRecord = { [key: string]: unknown };
const MAX_BODY_BYTES = 1_000_000, MAX_IMPORT_ROWS = 2000, MAX_ASSIGNMENT_TARGET = 5000;
function audit(sql: CloudSql, leadId: string | null, action: string, previous: unknown, next: unknown, request: NextRequest, context: string) { return sql("INSERT INTO lead_audit_log(lead_id,action,previous_value,new_value,actor,context) VALUES($1,$2,$3::jsonb,$4::jsonb,$5,$6)", [leadId, action, JSON.stringify(previous ?? null), JSON.stringify(next ?? null), request.headers.get("x-lead-discovery-actor")?.slice(0,120) || "preview-admin", context]); }
function mutationDenied(request: NextRequest) { return canMutateLeadDiscovery(request.headers.get("x-lead-discovery-write-token")) ? null : NextResponse.json({ detail: "Write authorization required" }, { status: 401 }); }

function text(value: unknown) { return typeof value === "string" ? value.trim() || null : value == null ? null : String(value); }
function normalizedText(value: unknown) { return (text(value) || "").normalize("NFKC").toLowerCase().replace(/&/g, " and ").replace(/[.'’]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " "); }
function website(value: unknown) {
  const input = text(value); if (!input) return null;
  const url = new URL(input.includes("://") ? input : `https://${input}`);
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || !url.hostname || !url.hostname.includes(".")) throw new Error("Website must be a public HTTP(S) URL");
  const host = url.hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
  if (/^(?:\d+\.){3}\d+$/.test(host) || host.endsWith(".local") || host.endsWith(".localhost")) throw new Error("Website must use a public domain name");
  const path = url.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "").replace(/^\/index\.html?$/i, "");
  const query = [...url.searchParams].filter(([key]) => !/^utm_/i.test(key) && !/^(gclid|fbclid)$/i.test(key)).sort(([a], [b]) => a.localeCompare(b));
  return `https://${host}${path}${query.length ? `?${new URLSearchParams(query)}` : ""}`;
}
function domain(value: unknown) { const url = website(value); return url ? new URL(url).hostname : null; }
function nameLocation(record: LeadRecord) {
  const name = normalizedText(record.institution_name), city = normalizedText(record.city);
  const rawState = normalizedText(record.state); const state = ({ "new york": "ny", "new jersey": "nj", connecticut: "ct" } as Record<string, string>)[rawState] || rawState;
  return name && (city || state) ? `${name}|${city}|${state}` : null;
}
function keys(record: LeadRecord): [string, string][] {
  const page = website(record.website); const source = website(record.source_url);
  return [["domain", domain(record.website)], ["website", page || source], ["name_location", nameLocation(record)]]
    .filter((entry): entry is [string, string] => Boolean(entry[1]));
}
function missing(record: LeadRecord) {
  const values: string[] = [];
  if (!text(record.institution_name)) values.push("institution_name");
  if (!text(record.city) && !text(record.state)) values.push("city_or_state");
  if (!text(record.website) && !(text(record.source_url) && TRUSTED.has(String(record.source_type)))) values.push("website_or_trusted_public_source");
  return values;
}
function decode(row: LeadRecord) {
  const record = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload as LeadRecord;
  record.id = row.id; record.revision = row.revision; record.created_at = row.created_at; record.updated_at = row.updated_at;
  record.assigned_salesperson = row.assigned_salesperson; record.status = row.status; record.review_status = row.verification_status;
  record.missing_requirements = missing(record);
  record.pool_ready = !record.missing_requirements.length && row.verification_status === "approved" && !["archived", "disqualified"].includes(String(row.status));
  record.contact_verification = record.email || record.phone ? "unverified" : "missing";
  return record;
}
function seed(row: LeadRecord): LeadRecord {
  const sub = String(row.subcategory || "").toLowerCase(); const category = String(row.category || "");
  const type = sub.includes("bookstore") ? "University Bookstore" : sub.includes("art museum") ? "Art Museum" : sub.includes("aquarium") ? "Aquarium" : sub.includes("zoo") ? "Zoo" : sub.includes("botanical") ? "Botanical Garden" : sub.includes("historic") ? "Historic Site" : sub.includes("festival") ? "Festival / Cultural Event" : sub.includes("university") ? "University" : sub.includes("museum") ? "Museum" : ({ "Tourism & Attractions": "Tourist Attraction", "Universities & Schools": "University", "Nonprofit Organizations": "Cultural Nonprofit", "Influencers & Events": "Festival / Cultural Event" } as Record<string, string>)[category] || "Other";
  return normalize({ institution_name: row.name, institution_type: type, website: row.website_url, city: row.city, state: row.state, country: row.country, phone: row.phone, contact_page: row.contact_page_url, source_url: row.source_url, source_type: row.source_type, reason_to_contact: row.recommended_product_angle, notes: row.evidence_notes });
}
function normalize(input: LeadRecord): LeadRecord {
  const record: LeadRecord = {};
  for (const key of ["institution_name", "institution_type", "website", "domain", "city", "state", "country", "phone", "email", "contact_page", "source_url", "source_type", "founded_year", "opened_year", "sales_signal", "reason_to_contact", "notes"]) record[key] = input[key] == null || input[key] === "" ? null : input[key];
  for (const key of ["website", "contact_page", "source_url"]) if (record[key]) record[key] = website(record[key]);
  record.domain = domain(record.website || record.domain);
  // Contacts are public leads only when an attributable public page is retained.
  if (!record.source_url && !record.contact_page) { record.email = null; record.phone = null; }
  if (record.email && /^partnerships\+[0-9a-f]{8}@/i.test(String(record.email))) record.email = null;
  record.status = STATUS.has(String(input.status)) ? input.status : "new";
  record.review_status = input.review_status === "approved" ? "approved" : "pending";
  return record;
}
async function setup() { if (!hasCloudLeadDatabase()) throw new Error("Lead Discovery Preview database is not configured."); await ensureLeadSchema(); return cloudSql(); }
async function insertIdentity(sql: CloudSql, id: string, entries: [string, string][]) { for (const [kind, value] of entries) await sql("INSERT INTO lead_identities(kind,value,institution_id) VALUES($1,$2,$3) ON CONFLICT(kind,value) DO NOTHING", [kind, value, id]); }
async function importRecords(records: LeadRecord[]) {
  if (!Array.isArray(records) || !records.length || records.length > MAX_IMPORT_ROWS) throw new Error(`Import must contain 1-${MAX_IMPORT_ROWS} records`);
  const sql = await setup(); const summary = { created: 0, duplicates: 0, review_required: 0, results: [] as LeadRecord[] };
  for (const raw of records) {
    const record = normalize(raw); const identities = keys(record); if (!identities.length) throw new Error("Each candidate needs a website, source URL or name plus location");
    let matched: LeadRecord | undefined; let reason = "";
    for (const [kind, value] of identities) { const rows = await sql("SELECT i.kind,i.institution_id,p.payload FROM lead_identities i JOIN lead_institutions p ON p.id=i.institution_id WHERE i.kind=$1 AND i.value=$2", [kind, value]); if (rows[0]) { matched = rows[0] as LeadRecord; reason = `same_${kind}`; if (kind === "website" || kind === "name_location") break; } }
    if (matched) {
      const old = typeof matched.payload === "string" ? JSON.parse(matched.payload as string) : matched.payload as LeadRecord;
      const nameDiff = Boolean(record.institution_name && old.institution_name && normalizedText(record.institution_name) !== normalizedText(old.institution_name));
      const locationDiff = Boolean(record.city && old.city && normalizedText(record.city) !== normalizedText(old.city)) || Boolean(record.state && old.state && normalizedText(record.state) !== normalizedText(old.state));
      const conflict = reason === "same_domain" && (nameDiff || locationDiff) && website(record.website) !== website(old.website);
      const fingerprint = createHash("sha256").update(`${matched.institution_id}:${JSON.stringify(record)}`).digest("hex");
      await sql("INSERT INTO lead_duplicate_events(fingerprint,institution_id,reason,needs_review,incoming) VALUES($1,$2,$3,$4,$5::jsonb) ON CONFLICT(fingerprint) DO NOTHING", [fingerprint, matched.institution_id, reason, conflict, JSON.stringify(record)]);
      if (conflict) { const id = randomUUID(); await save(sql, id, record); await insertIdentity(sql, id, identities); summary.created++; summary.review_required++; summary.results.push({ id, duplicate_reason: reason, needs_review: true }); }
      else { summary.duplicates++; summary.results.push({ id: matched.institution_id, duplicate_reason: reason, needs_review: false }); }
      continue;
    }
    const id = randomUUID(); await save(sql, id, record); await insertIdentity(sql, id, identities); summary.created++; summary.results.push({ id, duplicate_reason: null, needs_review: false });
  }
  return summary;
}
async function save(sql: CloudSql, id: string, record: LeadRecord) {
  const now = new Date().toISOString();
  await sql(`INSERT INTO lead_institutions(id,institution_name,institution_type,website,domain,city,state,country,phone,email,contact_page,source_url,source_type,founded_year,opened_year,sales_signal,reason_to_contact,assigned_salesperson,status,notes,verification_status,payload,created_at,updated_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NULL,$18,$19,'pending',$20::jsonb,$21,$21)`, [id, record.institution_name, record.institution_type, record.website, record.domain, record.city, record.state, record.country, record.phone, record.email, record.contact_page, record.source_url, record.source_type, record.founded_year, record.opened_year, record.sales_signal, record.reason_to_contact, record.status, record.notes, JSON.stringify(record), now]);
}
function csv(rows: LeadRecord[]) {
  const columns: [string, string][] = [["Institution Name","institution_name"],["Institution Type","institution_type"],["City","city"],["State","state"],["Country","country"],["Website","website"],["Contact Page","contact_page"],["Phone","phone"],["Email","email"],["Founded Year","founded_year"],["Opened Year","opened_year"],["Sales Signal","sales_signal"],["Reason to Contact","reason_to_contact"],["Source URL","source_url"],["Source Type","source_type"],["Assigned Salesperson","assigned_salesperson"],["Status","status"],["Notes","notes"],["ID","id"],["Domain","domain"],["Created At","created_at"],["Updated At","updated_at"],["Review Status","review_status"]];
  const cell = (value: unknown) => { let valueText = value == null ? "" : String(value); if (/^\s*[=+\-@]/.test(valueText)) valueText = `'${valueText}`; return /[",\r\n]/.test(valueText) ? `"${valueText.replaceAll('"','""')}"` : valueText; };
  return "\uFEFF" + [columns.map(([title]) => cell(title)).join(","), ...rows.map(row => columns.map(([, key]) => cell(row[key])).join(","))].join("\r\n") + "\r\n";
}
function parseCsv(content: string) {
  if (content.length > MAX_BODY_BYTES) throw new Error("CSV is too large");
  // Browser-tested parser already handles quoted newlines; use the same narrow export mapping here.
  const input = content.replace(/^\uFEFF/, ""); const rows: string[][] = []; let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < input.length; i++) { const ch = input[i]; if (quoted) { if (ch === '"' && input[i + 1] === '"') { field += '"'; i++; } else if (ch === '"') quoted = false; else field += ch; } else if (ch === '"' && !field) quoted = true; else if (ch === ",") { row.push(field); field = ""; } else if (ch === "\n" || ch === "\r") { if (ch === "\r" && input[i + 1] === "\n") i++; row.push(field); field = ""; if (row.some(Boolean)) rows.push(row); row = []; } else field += ch; }
  if (quoted) throw new Error("Unclosed quoted CSV field"); if (field || row.length) { row.push(field); rows.push(row); }
  const [header, ...values] = rows; if (!header?.length || new Set(header).size !== header.length) throw new Error("CSV requires unique headers");
  const aliases: Record<string, string> = { "Institution Name":"institution_name", "Institution Type":"institution_type", City:"city", State:"state", Country:"country", Website:"website", "Contact Page":"contact_page", Phone:"phone", Email:"email", "Founded Year":"founded_year", "Opened Year":"opened_year", "Sales Signal":"sales_signal", "Reason to Contact":"reason_to_contact", "Source URL":"source_url", "Source Type":"source_type", Status:"status", Notes:"notes" };
  if (header.some(item => !aliases[item])) throw new Error("Unrecognized columns; use the sales export template");
  const data = values.filter(values => values.some(Boolean)); if (data.length > MAX_IMPORT_ROWS) throw new Error(`CSV exceeds ${MAX_IMPORT_ROWS} records`); return data.map(values => { if (values.length !== header.length) throw new Error("CSV record has wrong column count"); return Object.fromEntries(header.map((title, index) => [aliases[title], values[index] || null])); });
}
async function list(request: NextRequest) { const sql = await setup(); const params = request.nextUrl.searchParams; const rawRows = await sql("SELECT * FROM lead_institutions ORDER BY created_at"); let rows = rawRows.map(row => decode(row as LeadRecord)); const query = params.get("query")?.toLowerCase(); const owner = params.get("assigned_salesperson")?.toLowerCase(); const review = params.get("review_status"); if (query) rows = rows.filter(row => [row.institution_name,row.city,row.state].some(value => String(value || "").toLowerCase().includes(query))); if (owner) rows = rows.filter(row => row.assigned_salesperson === owner); if (review) rows = rows.filter(row => row.review_status === review); const limit = Math.min(Math.max(Number(params.get("limit")) || 100,1),500), offset = Math.max(Number(params.get("offset")) || 0,0); return { total: rows.length, items: rows.slice(offset, offset + limit), limit, offset }; }

export async function GET(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) { try { const path = (await params).path || []; if (path[0] === "metadata") return NextResponse.json({ institution_types: TYPES, sales_signals: SIGNALS, external_discovery_enabled: false, storage: "isolated_preview_postgres" }); if (path[0] === "export.csv") { const result = await list(request); return new NextResponse(csv(result.items), { headers: { "content-type":"text/csv; charset=utf-8", "content-disposition":'attachment; filename="sales-leads.csv"' } }); } if (path[0] === "duplicates") { const sql = await setup(); const rows = await sql("SELECT * FROM lead_duplicate_events ORDER BY created_at DESC LIMIT 500"); return NextResponse.json({ items: rows }); } if (path[0] === "audit") { const sql = await setup(); return NextResponse.json({ items: await sql("SELECT * FROM lead_audit_log ORDER BY created_at DESC LIMIT 200") }); } return NextResponse.json(await list(request)); } catch { return NextResponse.json({ detail: "Lead database unavailable" }, { status: 503 }); } }
export async function POST(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) { try {
  const denied = mutationDenied(request); if (denied) return denied;
  if (Number(request.headers.get("content-length") || 0) > MAX_BODY_BYTES) return NextResponse.json({ detail: "Request too large" }, { status: 413 });
  const path = (await params).path || []; const body = await request.json().catch(() => ({})) as LeadRecord;
  if (path[0] === "import" && path[1] === "seeds") { const result = await importRecords((seedRows as unknown as LeadRecord[]).map(seed)); await audit(await setup(), null, "seed_import", null, { created: result.created, duplicates: result.duplicates }, request, "seed"); return NextResponse.json(result); }
  if (path[0] === "import" && path[1] === "csv") { const result = await importRecords(parseCsv(String(body.content || ""))); await audit(await setup(), null, "csv_import", null, { created: result.created, duplicates: result.duplicates }, request, "csv"); return NextResponse.json(result); }
  if (path[0] === "import" && path[1] === "records") { const result = await importRecords(Array.isArray(body.records) ? body.records as LeadRecord[] : []); await audit(await setup(), null, "record_import", null, { created: result.created, duplicates: result.duplicates }, request, "records"); return NextResponse.json(result); }
  if (path[0] !== "assign") return NextResponse.json({ detail: "Not found" }, { status: 404 });
  const sql = await setup(); const people = Array.isArray(body.salespeople) ? body.salespeople : [];
  const names = [...new Set(people.map(normalizedText).filter(Boolean))].slice(0,50); const target = Math.min(Number(body.target_per_person) || 100, MAX_ASSIGNMENT_TARGET);
  if (!names.length) throw new Error("At least one salesperson is required");
  const all = (await sql("SELECT * FROM lead_institutions WHERE assigned_salesperson IS NULL AND verification_status='approved' AND status NOT IN ('archived','disqualified') ORDER BY created_at")).map(row => decode(row as LeadRecord));
  const counts: Record<string, number> = Object.fromEntries(names.map(name => [name, 0]));
  const existing = await sql("SELECT assigned_salesperson,count(*)::int AS count FROM lead_institutions WHERE assigned_salesperson = ANY($1) GROUP BY assigned_salesperson", [names]);
  for (const row of existing as LeadRecord[]) counts[String(row.assigned_salesperson)] = Number(row.count);
  let assigned = 0;
  for (const row of all) { if (missing(row).length) continue; const owner = names.filter(name => counts[name] < target).sort((a,b) => counts[a] - counts[b])[0]; if (!owner) break; await sql("UPDATE lead_institutions SET assigned_salesperson=$1,updated_at=now(),revision=revision+1 WHERE id=$2 AND assigned_salesperson IS NULL", [owner, row.id]); counts[owner]++; assigned++; }
  const assignment = { assigned_now: assigned, counts, shortfall: Object.fromEntries(names.map(name => [name, Math.max(0,target-counts[name])])) }; await audit(sql, null, "assignment", null, assignment, request, "auto-assignment"); return NextResponse.json(assignment);
} catch (error) { const detail = error instanceof Error ? error.message : "Request rejected"; return NextResponse.json({ detail }, { status: /database is not configured/i.test(detail) ? 503 : 422 }); } }
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) { try { const denied = mutationDenied(request); if (denied) return denied; const id = (await params).path?.[0]; if (!id) return NextResponse.json({ detail: "Not found" }, { status: 404 }); const body = await request.json(); const sql = await setup(); const found = await sql("SELECT * FROM lead_institutions WHERE id=$1", [id]); if (!found[0]) return NextResponse.json({ detail: "Lead not found" }, { status: 404 }); const old = decode(found[0] as LeadRecord); if (Number(body.revision) !== old.revision) return NextResponse.json({ detail: "Lead changed; refresh before editing" }, { status: 409 }); const changes = { ...old, ...(body.review_status ? { review_status: body.review_status } : {}), ...(body.status ? { status: body.status } : {}), ...(body.notes !== undefined ? { notes: String(body.notes).slice(0,5000) } : {}), ...(body.reason_to_contact !== undefined ? { reason_to_contact: String(body.reason_to_contact).slice(0,1000) } : {}) }; if (!STATUS.has(String(changes.status))) return NextResponse.json({ detail: "Invalid status" }, { status: 422 }); if (changes.review_status === "approved" && missing(changes).length) return NextResponse.json({ detail: "Review requires name, location and website or trusted public source" }, { status: 422 }); const record = normalize(changes); await sql("UPDATE lead_institutions SET reason_to_contact=$1,notes=$2,status=$3,verification_status=$4,payload=$5::jsonb,updated_at=now(),revision=revision+1 WHERE id=$6 AND revision=$7", [record.reason_to_contact, record.notes, record.status, record.review_status, JSON.stringify(record), id, old.revision]); const result = await sql("SELECT * FROM lead_institutions WHERE id=$1", [id]); const updated = decode(result[0] as LeadRecord); await audit(sql, id, "lead_updated", old, updated, request, "review/status/note"); return NextResponse.json(updated); } catch (error) { const detail = error instanceof Error ? error.message : "Request rejected"; return NextResponse.json({ detail }, { status: /database is not configured/i.test(detail) ? 503 : 422 }); } }
