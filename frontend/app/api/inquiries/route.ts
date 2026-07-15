import { NextResponse } from "next/server";
import { siteConfig } from "@/lib/site";

export const runtime = "nodejs";

type InquiryItem = { productId?: string | null; slug?: string | null; name?: string | null; quantity?: number; notes?: string | null; image?: string | null; product_name?: string; image_url?: string };
type InquiryPayload = { name?: string; email?: string; company?: string; role?: string; country?: string; phone?: string; estimatedQuantity?: string; message?: string; source?: string; locale?: string; items?: InquiryItem[] };

class InquiryApiError extends Error {
  constructor(message: string, public status: number, public stage: string) { super(message); }
}

function clean(value: unknown, max = 2000) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new InquiryApiError(`Server configuration is missing ${name}.`, 503, "environment");
  return value;
}
function log(level: "info" | "error", event: string, data: Record<string, unknown>) {
  const output = JSON.stringify({ level, route: "/api/inquiries", event, ...data });
  if (level === "error") console.error(output); else console.log(output);
}
async function readError(response: Response) {
  const text = await response.text();
  try { const parsed = JSON.parse(text) as { message?: string; details?: string; code?: string }; return [parsed.message, parsed.details, parsed.code].filter(Boolean).join(" | "); }
  catch { return text.slice(0, 1000) || `HTTP ${response.status}`; }
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const requestId = request.headers.get("x-vercel-id") || crypto.randomUUID();
  log("info", "request_received", { requestId, contentType: request.headers.get("content-type") });

  try {
    let payload: InquiryPayload;
    try { payload = await request.json() as InquiryPayload; }
    catch { throw new InquiryApiError("The inquiry request body is not valid JSON.", 400, "parse"); }

    const name = clean(payload.name, 200);
    const email = clean(payload.email, 320);
    const country = clean(payload.country, 120);
    const items = Array.isArray(payload.items) ? payload.items.slice(0, 100) : [];
    log("info", "payload_parsed", { requestId, hasName: Boolean(name), hasEmail: Boolean(email), country, itemCount: items.length, source: clean(payload.source, 80) || "website" });

    if (!name || !email || !country || !/^\S+@\S+\.\S+$/.test(email)) {
      throw new InquiryApiError("Name, a valid email address, and country are required.", 400, "validation");
    }
    log("info", "validation_passed", { requestId });

    const url = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
    const key = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" };
    const inquiryPayload = { name, email, company: clean(payload.company, 200) || null, role: clean(payload.role, 120) || null, country, phone: clean(payload.phone, 80) || null, estimated_quantity: clean(payload.estimatedQuantity, 120) || null, message: clean(payload.message, 5000) || null, source: clean(payload.source, 80) || "website", locale: payload.locale === "zh" ? "zh" : "en" };
    log("info", "inquiry_insert_started", { requestId, source: inquiryPayload.source, locale: inquiryPayload.locale });

    const inquiryResponse = await fetch(`${url}/rest/v1/inquiries`, { method: "POST", headers, body: JSON.stringify(inquiryPayload) });
    if (!inquiryResponse.ok) throw new InquiryApiError(`Supabase rejected the inquiry: ${await readError(inquiryResponse)}`, 502, "inquiry_insert");
    const inquiry = (await inquiryResponse.json())[0] as { id?: string };
    if (!inquiry?.id) throw new InquiryApiError("Supabase did not return the new inquiry ID.", 502, "inquiry_insert");
    log("info", "inquiry_inserted", { requestId, inquiryId: inquiry.id });

    const databaseItems = items.map((item) => ({ inquiry_id: inquiry.id, product_id: clean(item.productId, 200) || null, product_slug: clean(item.slug, 300) || null, product_name: clean(item.name || item.product_name, 300) || "Product", quantity: Math.max(1, Math.min(100000, Number(item.quantity) || 1)), notes: clean(item.notes, 2000) || null, image_url: clean(item.image || item.image_url, 2000) || null }));
    if (databaseItems.length) {
      const itemResponse = await fetch(`${url}/rest/v1/inquiry_items`, { method: "POST", headers, body: JSON.stringify(databaseItems) });
      if (!itemResponse.ok) throw new InquiryApiError(`Supabase rejected the inquiry items: ${await readError(itemResponse)}`, 502, "item_insert");
    }
    log("info", "items_inserted", { requestId, inquiryId: inquiry.id, count: databaseItems.length });

    try {
      const emailResult = await sendNotification({ ...payload, name, email, country, items }, inquiry.id);
      log("info", "email_result", { requestId, inquiryId: inquiry.id, ...emailResult });
    } catch (error) {
      log("error", "email_failed_non_blocking", { requestId, inquiryId: inquiry.id, error: error instanceof Error ? error.message : String(error) });
    }

    log("info", "request_completed", { requestId, inquiryId: inquiry.id, durationMs: Date.now() - startedAt });
    return NextResponse.json({ success: true, id: inquiry.id, requestId });
  } catch (error) {
    const known = error instanceof InquiryApiError;
    const message = error instanceof Error ? error.message : String(error);
    log("error", "request_failed", { requestId, stage: known ? error.stage : "unexpected", error: message, durationMs: Date.now() - startedAt });
    return NextResponse.json({ error: known ? message : "An unexpected server error prevented the inquiry from being saved.", requestId }, { status: known ? error.status : 500 });
  }
}

async function sendNotification(payload: InquiryPayload & { name: string; email: string; country: string; items: InquiryItem[] }, id: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false, reason: "RESEND_API_KEY is not configured" };
  const to = process.env.INQUIRY_NOTIFICATION_EMAIL || siteConfig.contactEmail;
  const products = payload.items.length ? payload.items.map((item) => `${clean(item.name || item.product_name)} x ${item.quantity || 1}${item.notes ? ` - ${clean(item.notes)}` : ""}`).join("\n") : "General inquiry / catalog request";
  const text = `New Auctus Heritage inquiry\n\nName: ${payload.name}\nEmail: ${payload.email}\nCompany: ${clean(payload.company) || "Not provided"}\nCountry: ${payload.country}\nMessage: ${clean(payload.message) || "Not provided"}\n\nProducts:\n${products}\n\nAdmin: /admin/inquiries?id=${id}\n\nAuctus Heritage\nOperated by Auctus Lab LLC\nNew York, USA\n${siteConfig.contactEmail}`;
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: process.env.INQUIRY_FROM_EMAIL || "Auctus Heritage <onboarding@resend.dev>", to: [to], subject: `New Auctus Heritage Inquiry - ${payload.name}`, text }) });
  if (!response.ok) throw new Error(await readError(response));
  return { sent: true };
}
