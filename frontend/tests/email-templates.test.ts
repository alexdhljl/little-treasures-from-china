import { describe, expect, it } from "vitest";
import { customerConfirmationTemplate } from "@/lib/email/templates/customer-confirmation";
import { inquiryNotificationTemplate } from "@/lib/email/templates/inquiry-notification";
import type { InquiryEmailRecord } from "@/lib/inquiries/types";

const record: InquiryEmailRecord = { id: "11111111-1111-4111-8111-111111111111", createdAt: "2026-07-16T12:00:00.000Z", name: "Ada <Chen>", email: "ada@example.org", company: "Museum Shop", position: "Buyer", country: "United States", phone: "", estimatedQuantity: 50, preferredLanguage: "en", message: "Please quote <sample>.", locale: "en", source: "product_inquiry", sourcePage: "https://auctusheritage.com/en/inquiry", referrer: "", idempotencyKey: "test-key-1234567890", turnstileToken: "", website: "", items: [{ productId: "p1", slug: "sample", name: "Sample Gift", quantity: 2, notes: null, imageUrl: null, productUrl: "https://auctusheritage.com/en/products/sample" }] };

describe("transactional email templates", () => {
  it("creates responsive internal HTML and plain text without unsafe customer HTML", () => {
    const email = inquiryNotificationTemplate(record);
    expect(email.html).toContain("New inquiry received");
    expect(email.html).toContain("Ada &lt;Chen&gt;");
    expect(email.html).not.toContain("Please quote <sample>.");
    expect(email.text).toContain(record.id);
  });

  it("creates the English customer confirmation", () => {
    const email = customerConfirmationTemplate(record);
    expect(email.subject).toBe("We received your Auctus Heritage inquiry");
    expect(email.text).toContain("1-2 business days");
  });

  it("creates the Chinese customer confirmation", () => {
    const email = customerConfirmationTemplate({ ...record, locale: "zh", preferredLanguage: "zh" });
    expect(email.subject).toContain("我们已收到");
    expect(email.text).toContain("1-2 个工作日");
  });
});
