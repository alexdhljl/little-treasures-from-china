import "server-only";

import { Resend } from "resend";

let client: Resend | null = null;

export function getResend() {
  if (client) return client;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Transactional email is not configured.");
  client = new Resend(apiKey);
  return client;
}
