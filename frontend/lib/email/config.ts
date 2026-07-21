import "server-only";

export const PUBLIC_EMAIL =
  process.env.PUBLIC_EMAIL ||
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ||
  "hello@auctusheritage.com";

export const ADMIN_NOTIFICATION_EMAIL =
  process.env.ADMIN_NOTIFICATION_EMAIL ||
  "alexdhljl@gmail.com";

export const TRANSACTIONAL_FROM =
  process.env.TRANSACTIONAL_FROM ||
  `Auctus Heritage <${PUBLIC_EMAIL}>`;

export const TRANSACTIONAL_REPLY_TO =
  process.env.TRANSACTIONAL_REPLY_TO ||
  process.env.INQUIRY_REPLY_TO ||
  PUBLIC_EMAIL;

export type InternalNotificationEvent =
  | "new_inquiry"
  | "order_placed"
  | "payment_received"
  | "supplier_message"
  | "inventory_alert";

export function getInternalNotificationRecipient(event: InternalNotificationEvent) {
  void event;
  return ADMIN_NOTIFICATION_EMAIL;
}
