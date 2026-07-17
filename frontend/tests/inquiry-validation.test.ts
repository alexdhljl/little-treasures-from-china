import { describe, expect, it } from "vitest";
import { validateInquiryPayload } from "@/lib/inquiries/validation";

const valid = { name: "Ada Chen", email: "ada@example.org", country: "United States", message: "Please send a catalog.", locale: "en", source: "catalog_request", idempotencyKey: "test-key-1234567890", items: [] };

describe("inquiry validation", () => {
  it("accepts a valid account-free catalog request", () => {
    expect(validateInquiryPayload(valid)).toMatchObject({ name: "Ada Chen", source: "catalog_request", locale: "en" });
  });

  it.each([
    [{ ...valid, name: "" }, "Name is required."],
    [{ ...valid, email: "not-an-email" }, "Enter a valid email address."],
    [{ ...valid, country: "" }, "Country is required."],
    [{ ...valid, message: "x".repeat(5001) }, "Message must be 5,000 characters or fewer."],
  ])("rejects invalid input", (payload, message) => {
    expect(() => validateInquiryPayload(payload)).toThrow(message);
  });

  it("rejects invalid product quantities", () => {
    expect(() => validateInquiryPayload({ ...valid, items: [{ productId: "123", quantity: 0 }] })).toThrow("Product quantity");
  });
});
