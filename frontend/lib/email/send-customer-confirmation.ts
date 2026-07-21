import "server-only";

import { TRANSACTIONAL_FROM, TRANSACTIONAL_REPLY_TO } from "@/lib/email/config";
import { getResend } from "@/lib/email/resend";
import { customerConfirmationTemplate } from "@/lib/email/templates/customer-confirmation";
import type { InquiryEmailInput } from "@/lib/email/types";

export async function sendCustomerConfirmation(input: InquiryEmailInput, attempt = "initial") {
  const content = customerConfirmationTemplate(input);
  const { data, error } = await getResend().emails.send({
    from: TRANSACTIONAL_FROM,
    to: [input.email],
    replyTo: TRANSACTIONAL_REPLY_TO,
    subject: content.subject,
    html: content.html,
    text: content.text,
  }, { idempotencyKey: `inquiry-confirmation-${input.id}-${attempt}` });
  if (error) throw new Error(`${error.name}: ${error.message}`);
  return data?.id || null;
}
