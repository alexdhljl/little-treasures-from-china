import { NextResponse } from "next/server";

type InquiryItem = { productId?: string | null; slug?: string | null; name?: string | null; quantity?: number; notes?: string | null; image?: string | null; product_name?: string; image_url?: string };
type InquiryPayload = { name?: string; email?: string; company?: string; role?: string; country?: string; phone?: string; estimatedQuantity?: string; message?: string; source?: string; locale?: string; items?: InquiryItem[] };

function requiredEnv(name: string) { const value = process.env[name]; if (!value) throw new Error(`Missing ${name}`); return value; }
function clean(value: unknown, max = 2000) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }

export async function POST(request: Request) {
  try {
    const payload = await request.json() as InquiryPayload;
    const name = clean(payload.name, 200); const email = clean(payload.email, 320); const country = clean(payload.country, 120);
    if (!name || !email || !country || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Name, valid email, and country are required." }, { status: 400 });
    const url = requiredEnv("NEXT_PUBLIC_SUPABASE_URL"); const key = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" };
    const inquiryResponse = await fetch(`${url}/rest/v1/inquiries`, { method: "POST", headers, body: JSON.stringify({ name, email, company: clean(payload.company, 200) || null, role: clean(payload.role, 120) || null, country, phone: clean(payload.phone, 80) || null, estimated_quantity: clean(payload.estimatedQuantity, 120) || null, message: clean(payload.message, 5000) || null, source: clean(payload.source, 80) || "website", locale: payload.locale === "zh" ? "zh" : "en" }) });
    if (!inquiryResponse.ok) throw new Error(await inquiryResponse.text());
    const inquiry = (await inquiryResponse.json())[0] as { id: string };
    const items = (payload.items || []).slice(0, 100);
    const databaseItems = items.map((item) => ({ inquiry_id: inquiry.id, product_id: clean(item.productId, 200) || null, product_slug: clean(item.slug, 300) || null, product_name: clean(item.name, 300) || "Product", quantity: Math.max(1, Math.min(100000, Number(item.quantity) || 1)), notes: clean(item.notes, 2000) || null, image_url: clean(item.image, 2000) || null }));
    if (databaseItems.length) { const itemResponse = await fetch(`${url}/rest/v1/inquiry_items`, { method: "POST", headers, body: JSON.stringify(databaseItems) }); if (!itemResponse.ok) throw new Error(await itemResponse.text()); }
    await sendNotification({ ...payload, name, email, country, items }, inquiry.id).catch((error) => console.error("Inquiry email notification failed", error));
    return NextResponse.json({ success: true, id: inquiry.id });
  } catch (error) { console.error("Inquiry submission failed", error); return NextResponse.json({ error: "We could not submit your inquiry. Please try again." }, { status: 500 }); }
}

async function sendNotification(payload: InquiryPayload & { name: string; email: string; country: string; items: InquiryItem[] }, id: string) {
  const apiKey = process.env.RESEND_API_KEY; if (!apiKey) return;
  const to = process.env.INQUIRY_NOTIFICATION_EMAIL || "hello@auctuslab.com";
  const products = payload.items.length ? payload.items.map((item) => `${clean(item.name || item.product_name)} × ${item.quantity || 1}${item.notes ? ` — ${clean(item.notes)}` : ""}`).join("\n") : "General inquiry / catalog request";
  const text = `New Little Treasures inquiry\n\nName: ${payload.name}\nEmail: ${payload.email}\nCompany: ${clean(payload.company) || "—"}\nCountry: ${payload.country}\nMessage: ${clean(payload.message) || "—"}\n\nProducts:\n${products}\n\nAdmin: /admin/inquiries?id=${id}`;
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: process.env.INQUIRY_FROM_EMAIL || "Little Treasures <onboarding@resend.dev>", to: [to], subject: `New Little Treasures Inquiry - ${payload.name}`, text }) });
  if (!response.ok) throw new Error(await response.text());
}
