import "server-only";

import type { InquiryEmailRecord, ResolvedInquiryItem } from "@/lib/inquiries/types";

type AdminRow = { id: string; created_at: string; name: string; email: string; company: string | null; position: string | null; role: string | null; country: string; phone: string | null; estimated_quantity: string | null; message: string | null; locale: "en" | "zh"; preferred_language: "en" | "zh" | null; submission_source: string; source: string; source_page: string | null; referrer: string | null; inquiry_items: Array<{ product_id: string | null; product_slug: string | null; product_name: string; quantity: number; notes: string | null; image_url: string | null; product_url: string | null }> };

export async function getInquiryForEmail(id: string): Promise<InquiryEmailRecord> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Inquiry storage is not configured.");
  const response = await fetch(`${url}/rest/v1/inquiries?id=eq.${encodeURIComponent(id)}&select=*,inquiry_items(*)&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load the inquiry.");
  const row = (await response.json() as AdminRow[])[0];
  if (!row) throw new Error("Inquiry not found.");
  const items: ResolvedInquiryItem[] = row.inquiry_items.map((item) => ({ productId: item.product_id || "", slug: item.product_slug || "", name: item.product_name, quantity: item.quantity, notes: item.notes, imageUrl: item.image_url, productUrl: item.product_url || `https://auctusheritage.com/${row.locale}/products/${item.product_slug || ""}` }));
  return { id: row.id, createdAt: row.created_at, name: row.name, email: row.email, company: row.company || "", position: row.position || row.role || "", country: row.country, phone: row.phone || "", estimatedQuantity: row.estimated_quantity ? Number(row.estimated_quantity) : null, preferredLanguage: row.preferred_language || row.locale, message: row.message || "", locale: row.locale, source: (row.submission_source || row.source || "website") as InquiryEmailRecord["source"], sourcePage: row.source_page || "", referrer: row.referrer || "", idempotencyKey: "admin-resend", turnstileToken: "", website: "", items };
}
