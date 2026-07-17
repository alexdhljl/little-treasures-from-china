import "server-only";

import { getResend } from "@/lib/email/resend";
import { customerConfirmationTemplate } from "@/lib/email/templates/customer-confirmation";
import type { InquiryEmailInput } from "@/lib/email/types";

function required(name: "INQUIRY_FROM_EMAIL" | "INQUIRY_REPLY_TO") {
  const value = process.env[name];
  if (!value) throw new Error(`Missing email configuration: ${name}`);
  return value;
}

export async function sendCustomerConfirmation(input: InquiryEmailInput, attempt = "initial") {
  const content = customerConfirmationTemplate(input);
  const { data, error } = await getResend().emails.send({
    from: required("INQUIRY_FROM_EMAIL"),
    to: [input.email],
    replyTo: required("INQUIRY_REPLY_TO"),
    subject: content.subject,
    html: content.html,
    text: content.text,
  }, { idempotencyKey: `inquiry-confirmation-${input.id}-${attempt}` });
  if (error) throw new Error(`${error.name}: ${error.message}`);
  return data?.id || null;
}
