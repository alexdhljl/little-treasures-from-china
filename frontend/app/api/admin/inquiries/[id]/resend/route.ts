import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin/server-auth";
import { sendCustomerConfirmation } from "@/lib/email/send-customer-confirmation";
import { sendInquiryNotification } from "@/lib/email/send-inquiry-notification";
import { getInquiryForEmail } from "@/lib/inquiries/admin-server";
import { updateEmailStatus } from "@/lib/inquiries/server";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdminRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => ({})) as { kind?: string };
  if (body.kind !== "notification" && body.kind !== "confirmation") return NextResponse.json({ error: "Invalid email type." }, { status: 400 });
  try {
    const inquiry = await getInquiryForEmail(id);
    const attempt = `admin-${Date.now()}`;
    if (body.kind === "notification") await sendInquiryNotification(inquiry, attempt);
    else await sendCustomerConfirmation(inquiry, attempt);
    await updateEmailStatus(id, body.kind, "sent");
    console.log(JSON.stringify({ level: "info", event: "admin_email_resent", inquiryId: id, kind: body.kind }));
    return NextResponse.json({ success: true });
  } catch (error) {
    const reason = (error instanceof Error ? error.message : "Email resend failed.").replace(/re_[A-Za-z0-9_-]+/g, "[redacted]").slice(0, 500);
    await updateEmailStatus(id, body.kind, "failed", reason).catch(() => undefined);
    console.error(JSON.stringify({ level: "error", event: "admin_email_resend_failed", inquiryId: id, kind: body.kind, reason }));
    return NextResponse.json({ error: "Unable to resend this email." }, { status: 502 });
  }
}
