import type { InquirySource, InquirySubmission, SubmittedInquiryItem } from "@/lib/inquiries/types";

export class InquiryValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = "InquiryValidationError";
  }
}

const sources = new Set<InquirySource>([
  "general_contact", "product_inquiry", "catalog_request", "partner_inquiry", "career_inquiry", "website",
]);

function text(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
}

function required(value: unknown, max: number, field: string) {
  const result = text(value, max);
  if (!result) throw new InquiryValidationError(`${field} is required.`, field);
  return result;
}

function parseItems(value: unknown): SubmittedInquiryItem[] {
  if (!Array.isArray(value)) return [];
  if (value.length > 50) throw new InquiryValidationError("Too many products were selected.", "items");
  return value.map((raw) => {
    const item = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
    const productId = text(item.productId, 100);
    const slug = text(item.slug, 200);
    if (!productId && !slug) throw new InquiryValidationError("A selected product is invalid.", "items");
    const quantity = Number(item.quantity ?? 1);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000) {
      throw new InquiryValidationError("Product quantity must be between 1 and 100,000.", "items");
    }
    return { productId: productId || undefined, slug: slug || undefined, quantity, notes: text(item.notes, 1000) || undefined };
  });
}

export function validateInquiryPayload(value: unknown): InquirySubmission {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const name = required(input.name, 100, "Name");
  const email = required(input.email, 254, "Email").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new InquiryValidationError("Enter a valid email address.", "Email");
  const country = required(input.country, 100, "Country");
  const message = text(input.message, 5001);
  if (message.length > 5000) throw new InquiryValidationError("Message must be 5,000 characters or fewer.", "Message");
  const estimatedRaw = text(input.estimatedQuantity, 20);
  const estimatedQuantity = estimatedRaw ? Number(estimatedRaw) : null;
  if (estimatedQuantity !== null && (!Number.isInteger(estimatedQuantity) || estimatedQuantity < 1 || estimatedQuantity > 1000000)) {
    throw new InquiryValidationError("Estimated quantity must be a positive whole number.", "Estimated Quantity");
  }
  const locale = input.locale === "zh" ? "zh" : "en";
  const rawSource = text(input.source, 50) as InquirySource;
  const source = sources.has(rawSource) ? rawSource : "website";
  const idempotencyKey = required(input.idempotencyKey, 100, "Submission reference");
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(idempotencyKey)) {
    throw new InquiryValidationError("The submission reference is invalid.", "Submission reference");
  }
  return {
    name, email, company: text(input.company, 200), position: text(input.position ?? input.role, 150), country,
    phone: text(input.phone, 50), estimatedQuantity, preferredLanguage: input.preferredLanguage === "zh" ? "zh" : locale,
    message, locale, source, sourcePage: text(input.sourcePage, 500), referrer: text(input.referrer, 1000),
    idempotencyKey, turnstileToken: text(input.turnstileToken, 2048), website: text(input.website, 500), items: parseItems(input.items),
  };
}
