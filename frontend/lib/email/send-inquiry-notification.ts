import "server-only";

import { getResend } from "@/lib/email/resend";
import { inquiryNotificationTemplate } from "@/lib/email/templates/inquiry-notification";
import type { InquiryEmailInput } from "@/lib/email/types";

function required(name: "INQUIRY_NOTIFICATION_EMAIL" | "INQUIRY_FROM_EMAIL") {
  const value = process.env[name];
  if (!value) throw new Error(`Missing email configuration: ${name}`);
  return value;
}

function recipientFor(source: string) {
  if (source === "partner_inquiry") return process.env.NEXT_PUBLIC_PARTNER_EMAIL || required("INQUIRY_NOTIFICATION_EMAIL");
  if (source === "career_inquiry") return process.env.NEXT_PUBLIC_CAREERS_EMAIL || required("INQUIRY_NOTIFICATION_EMAIL");
  return required("INQUIRY_NOTIFICATION_EMAIL");
}

export async function sendInquiryNotification(input: InquiryEmailInput, attempt = "initial") {
  const content = inquiryNotificationTemplate(input);
  const { data, error } = await getResend().emails.send({
    from: required("INQUIRY_FROM_EMAIL"),
    to: [recipientFor(input.source)],
    replyTo: input.email,
    subject: content.subject,
    html: content.html,
    text: content.text,
  }, { idempotencyKey: `inquiry-notification-${input.id}-${attempt}` });
  if (error) throw new Error(`${error.name}: ${error.message}`);
  return data?.id || null;
}
