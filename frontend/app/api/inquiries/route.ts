import { NextResponse } from "next/server";
import { sendCustomerConfirmation } from "@/lib/email/send-customer-confirmation";
import { sendInquiryNotification } from "@/lib/email/send-inquiry-notification";
import { createInquiry, findExistingInquiry, hashValue, resolveProducts, submissionFingerprint, updateEmailStatus } from "@/lib/inquiries/server";
import type { InquiryEmailRecord } from "@/lib/inquiries/types";
import { InquiryValidationError, validateInquiryPayload } from "@/lib/inquiries/validation";

export const runtime = "nodejs";

const attempts = new Map<string, number[]>();
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 5;

function log(level: "info" | "error" | "warn", event: string, data: Record<string, unknown>) {
  const output = JSON.stringify({ level, route: "/api/inquiries", event, ...data });
  if (level === "error") console.error(output);
  else if (level === "warn") console.warn(output);
  else console.log(output);
}

function safeError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  return message.replace(/re_[A-Za-z0-9_-]+/g, "[redacted]").slice(0, 500);
}

function checkRateLimit(key: string) {
  const now = Date.now();
  const recent = (attempts.get(key) || []).filter((time) => now - time < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return false;
  recent.push(now);
  attempts.set(key, recent);
  if (attempts.size > 5000) attempts.clear();
  return true;
}

async function verifyTurnstile(token: string, remoteIp: string) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!siteKey && !secret) return;
  if (!siteKey || !secret) {
    if (process.env.NODE_ENV === "production") throw new Error("Anti-spam verification is temporarily unavailable.");
    return;
  }
  if (!token) throw new InquiryValidationError("Complete the anti-spam verification.");
  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body, cache: "no-store" });
  const result = await response.json() as { success?: boolean };
  if (!result.success) throw new InquiryValidationError("Anti-spam verification failed. Please try again.");
}

async function deliverEmails(record: InquiryEmailRecord, requestId: string) {
  let notification: "sent" | "failed" = "failed";
  let confirmation: "sent" | "failed" = "failed";
  try {
    await sendInquiryNotification(record);
    notification = "sent";
    await updateEmailStatus(record.id, "notification", "sent");
    log("info", "internal_email_sent", { requestId, inquiryId: record.id });
  } catch (error) {
    const reason = safeError(error);
    await updateEmailStatus(record.id, "notification", "failed", reason).catch(() => undefined);
    log("error", "internal_email_failed", { requestId, inquiryId: record.id, reason });
  }
  try {
    await sendCustomerConfirmation(record);
    confirmation = "sent";
    await updateEmailStatus(record.id, "confirmation", "sent");
    log("info", "customer_confirmation_sent", { requestId, inquiryId: record.id });
  } catch (error) {
    const reason = safeError(error);
    await updateEmailStatus(record.id, "confirmation", "failed", reason).catch(() => undefined);
    log("error", "customer_confirmation_failed", { requestId, inquiryId: record.id, reason });
  }
  return { notification, confirmation };
}

export async function POST(request: Request) {
  const requestId = request.headers.get("x-vercel-id") || crypto.randomUUID();
  const userAgent = (request.headers.get("user-agent") || "").slice(0, 500);
  const remoteIp = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  const requestIdentifier = hashValue(`${remoteIp}|${userAgent}`);

  try {
    const raw = await request.json().catch(() => { throw new InquiryValidationError("The request body is invalid."); });
    const payload = validateInquiryPayload(raw);
    if (payload.website) {
      log("warn", "honeypot_blocked", { requestId, requestIdentifier });
      return NextResponse.json({ error: "Unable to submit this inquiry." }, { status: 400 });
    }
    if (!checkRateLimit(requestIdentifier)) {
      log("warn", "rate_limit_triggered", { requestId, requestIdentifier });
      return NextResponse.json({ error: "Too many submissions. Please wait a few minutes and try again." }, { status: 429 });
    }
    await verifyTurnstile(payload.turnstileToken, remoteIp);

    const fingerprint = submissionFingerprint(payload);
    const duplicate = await findExistingInquiry(payload.idempotencyKey, fingerprint);
    if (duplicate) {
      log("info", "duplicate_submission_blocked", { requestId, inquiryId: duplicate.id });
      return NextResponse.json({ success: true, id: duplicate.id, duplicate: true, emailDelivery: { notification: duplicate.notification_status, confirmation: duplicate.confirmation_status } });
    }

    const items = await resolveProducts(payload);
    const saved = await createInquiry(payload, items, fingerprint, requestIdentifier, userAgent);
    log("info", "inquiry_saved", { requestId, inquiryId: saved.id, itemCount: items.length, source: payload.source });

    const record: InquiryEmailRecord = { ...payload, id: saved.id, createdAt: saved.created_at, items };
    const emailDelivery = await deliverEmails(record, requestId);
    return NextResponse.json({ success: true, id: saved.id, duplicate: false, emailDelivery });
  } catch (error) {
    const validation = error instanceof InquiryValidationError;
    const reason = safeError(error);
    log("error", validation ? "validation_failed" : "inquiry_save_failed", { requestId, reason });
    return NextResponse.json({ error: validation ? error.message : "We could not save your inquiry. Please try again.", requestId }, { status: validation ? 400 : 503 });
  }
}
