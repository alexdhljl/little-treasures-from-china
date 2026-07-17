import type { InquiryEmailRecord } from "@/lib/inquiries/types";

export type EmailContent = { subject: string; html: string; text: string };
export type InquiryEmailInput = InquiryEmailRecord;
