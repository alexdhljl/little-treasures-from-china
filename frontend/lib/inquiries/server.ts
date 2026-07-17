import "server-only";

import { createHash } from "node:crypto";
import type { EmailDeliveryStatus, InquirySubmission, ResolvedInquiryItem } from "@/lib/inquiries/types";

type ProductRow = { id: string; slug: string; product_name_en: string | null; product_name_zh: string | null; english_name: string | null; name: string | null; cover_image: string | null; images: string[] | null };
export type StoredInquiry = { id: string; created_at: string; name: string; email: string; company: string | null; position: string | null; country: string; phone: string | null; estimated_quantity: string | null; message: string | null; locale: "en" | "zh"; preferred_language: "en" | "zh" | null; submission_source: string; source_page: string | null; referrer: string | null; notification_status: EmailDeliveryStatus; confirmation_status: EmailDeliveryStatus };

function env(name: "NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY") {
  const value = process.env[name];
  if (!value) throw new Error(`Missing server configuration: ${name}`);
  return value;
}

function headers(prefer?: string) {
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(prefer ? { Prefer: prefer } : {}) };
}

async function parse<T>(response: Response, operation: string): Promise<T> {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${operation} failed (${response.status}): ${body.slice(0, 400)}`);
  }
  return response.status === 204 ? undefined as T : await response.json() as T;
}

export function hashValue(value: string) { return createHash("sha256").update(value).digest("hex"); }

export function submissionFingerprint(payload: InquirySubmission) {
  const products = payload.items.map((item) => `${item.productId || ""}:${item.slug || ""}:${item.quantity || 1}`).sort().join("|");
  return hashValue([payload.email, payload.source, payload.message, products].join("\n"));
}

export async function findExistingInquiry(idempotencyKey: string, fingerprint: string) {
  const base = env("NEXT_PUBLIC_SUPABASE_URL");
  const byKey = await fetch(`${base}/rest/v1/inquiries?idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&select=*&limit=1`, { headers: headers(), cache: "no-store" });
  const keyRows = await parse<StoredInquiry[]>(byKey, "Inquiry lookup");
  if (keyRows[0]) return keyRows[0];
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const byFingerprint = await fetch(`${base}/rest/v1/inquiries?submission_fingerprint=eq.${fingerprint}&created_at=gte.${encodeURIComponent(cutoff)}&select=*&order=created_at.desc&limit=1`, { headers: headers(), cache: "no-store" });
  return (await parse<StoredInquiry[]>(byFingerprint, "Duplicate inquiry lookup"))[0] || null;
}

export async function resolveProducts(payload: InquirySubmission): Promise<ResolvedInquiryItem[]> {
  if (!payload.items.length) return [];
  const base = env("NEXT_PUBLIC_SUPABASE_URL");
  const ids = payload.items.map((item) => item.productId).filter((value): value is string => Boolean(value && /^[0-9a-f-]{36}$/i.test(value)));
  const slugs = payload.items.map((item) => item.slug).filter((value): value is string => Boolean(value));
  const select = "id,slug,product_name_en,product_name_zh,english_name,name,cover_image,images";
  const rows: ProductRow[] = [];
  if (ids.length) {
    const response = await fetch(`${base}/rest/v1/products?id=in.(${ids.map(encodeURIComponent).join(",")})&select=${select}`, { headers: headers(), cache: "no-store" });
    rows.push(...await parse<ProductRow[]>(response, "Product ID lookup"));
  }
  if (slugs.length) {
    const response = await fetch(`${base}/rest/v1/products?slug=in.(${slugs.map(encodeURIComponent).join(",")})&select=${select}`, { headers: headers(), cache: "no-store" });
    rows.push(...await parse<ProductRow[]>(response, "Product slug lookup"));
  }
  const unique = new Map(rows.map((row) => [row.id, row]));
  return payload.items.map((item) => {
    const product = [...unique.values()].find((row) => row.id === item.productId || row.slug === item.slug);
    if (!product) throw new Error("One or more selected products are no longer available.");
    const name = payload.locale === "zh" ? product.product_name_zh || product.name || product.product_name_en || product.english_name || product.slug : product.product_name_en || product.english_name || product.product_name_zh || product.name || product.slug;
    return { productId: product.id, slug: product.slug, name, quantity: item.quantity || 1, notes: item.notes || null, imageUrl: product.cover_image || product.images?.[0] || null, productUrl: `https://auctusheritage.com/${payload.locale}/products/${product.slug}` };
  });
}

export async function createInquiry(payload: InquirySubmission, items: ResolvedInquiryItem[], fingerprint: string, requestIdentifier: string, userAgent: string) {
  const base = env("NEXT_PUBLIC_SUPABASE_URL");
  const response = await fetch(`${base}/rest/v1/rpc/create_inquiry_with_items`, {
    method: "POST", headers: headers(),
    body: JSON.stringify({
      p_inquiry: { name: payload.name, email: payload.email, company: payload.company, position: payload.position, country: payload.country, phone: payload.phone, estimated_quantity: payload.estimatedQuantity?.toString() || "", message: payload.message, source: payload.source, locale: payload.locale, preferred_language: payload.preferredLanguage, source_page: payload.sourcePage, referrer: payload.referrer, idempotency_key: payload.idempotencyKey, submission_fingerprint: fingerprint, request_identifier: requestIdentifier, user_agent: userAgent },
      p_items: items.map((item) => ({ product_id: item.productId, product_slug: item.slug, product_name: item.name, quantity: item.quantity, notes: item.notes, image_url: item.imageUrl, product_url: item.productUrl })),
    }),
  });
  const id = await parse<string>(response, "Inquiry transaction");
  const savedResponse = await fetch(`${base}/rest/v1/inquiries?id=eq.${encodeURIComponent(id)}&select=*&limit=1`, { headers: headers(), cache: "no-store" });
  const inquiry = (await parse<StoredInquiry[]>(savedResponse, "Saved inquiry lookup"))[0];
  if (!inquiry) throw new Error("Inquiry transaction did not return a saved record.");
  return inquiry;
}

export async function updateEmailStatus(id: string, kind: "notification" | "confirmation", status: EmailDeliveryStatus, error?: string) {
  const base = env("NEXT_PUBLIC_SUPABASE_URL");
  const response = await fetch(`${base}/rest/v1/inquiries?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: headers(), body: JSON.stringify({ [`${kind}_status`]: status, [`${kind}_sent_at`]: status === "sent" ? new Date().toISOString() : null, [`${kind}_error`]: error ? error.slice(0, 500) : null }) });
  await parse<unknown>(response, `${kind} status update`);
}
