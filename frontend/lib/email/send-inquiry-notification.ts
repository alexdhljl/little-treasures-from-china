import "server-only";

import { getInternalNotificationRecipient, TRANSACTIONAL_FROM } from "@/lib/email/config";
import { getResend } from "@/lib/email/resend";
import { inquiryNotificationTemplate } from "@/lib/email/templates/inquiry-notification";
import type { InquiryEmailInput } from "@/lib/email/types";

export async function sendInquiryNotification(input: InquiryEmailInput, attempt = "initial") {
  const content = inquiryNotificationTemplate(input);
  const { data, error } = await getResend().emails.send({
    from: TRANSACTIONAL_FROM,
    to: [getInternalNotificationRecipient("new_inquiry")],
    replyTo: input.email,
    subject: content.subject,
    html: content.html,
    text: content.text,
  }, { idempotencyKey: `inquiry-notification-${input.id}-${attempt}` });
  if (error) throw new Error(`${error.name}: ${error.message}`);
  return data?.id || null;
}
