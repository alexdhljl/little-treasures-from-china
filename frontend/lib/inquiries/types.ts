export type InquiryLocale = "en" | "zh";
export type InquirySource =
  | "general_contact"
  | "product_inquiry"
  | "catalog_request"
  | "partner_inquiry"
  | "career_inquiry"
  | "website";

export type SubmittedInquiryItem = {
  productId?: string;
  slug?: string;
  quantity?: number;
  notes?: string;
};

export type InquirySubmission = {
  name: string;
  email: string;
  company: string;
  position: string;
  country: string;
  phone: string;
  estimatedQuantity: number | null;
  preferredLanguage: InquiryLocale;
  message: string;
  locale: InquiryLocale;
  source: InquirySource;
  sourcePage: string;
  referrer: string;
  idempotencyKey: string;
  turnstileToken: string;
  website: string;
  items: SubmittedInquiryItem[];
};

export type ResolvedInquiryItem = {
  productId: string;
  slug: string;
  name: string;
  quantity: number;
  notes: string | null;
  imageUrl: string | null;
  productUrl: string;
};

export type InquiryEmailRecord = Omit<InquirySubmission, "items"> & {
  id: string;
  createdAt: string;
  items: ResolvedInquiryItem[];
};

export type EmailDeliveryStatus = "pending" | "sent" | "failed" | "not_required";
