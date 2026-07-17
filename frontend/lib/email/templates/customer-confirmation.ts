import type { EmailContent, InquiryEmailInput } from "@/lib/email/types";
import { emailShell, escapeHtml } from "@/lib/email/templates/shared";

export function customerConfirmationTemplate(input: InquiryEmailInput): EmailContent {
  const isZh = input.locale === "zh";
  const subject = isZh ? "我们已收到您的 Auctus Heritage 询价" : "We received your Auctus Heritage inquiry";
  const productHtml = input.items.length ? `<ul style="padding-left:20px;line-height:1.8">${input.items.map((item) => `<li>${escapeHtml(item.name)} × ${item.quantity}</li>`).join("")}</ul>` : `<p style="color:#666">${isZh ? "一般咨询 / 目录申请" : "General inquiry / catalog request"}</p>`;
  const copy = isZh
    ? { hello: `您好，${input.name}：`, thanks: "感谢您联系 Auctus Heritage。", received: "我们已经收到您的询价，并将核对相关产品、数量、价格、运输方式及交付周期。", timing: "我们通常会在 1-2 个工作日内回复。", ref: "询价编号", products: "询价产品", close: "此致" }
    : { hello: `Hello ${input.name},`, thanks: "Thank you for contacting Auctus Heritage.", received: "We have received your inquiry and will review the requested products, quantities, pricing, shipping, and lead time.", timing: "We normally respond within 1-2 business days.", ref: "Inquiry reference", products: "Selected products", close: "Best regards" };
  const html = emailShell(subject, `<p style="margin:28px 0 16px;font-size:17px">${escapeHtml(copy.hello)}</p><p style="line-height:1.7">${escapeHtml(copy.thanks)}</p><p style="line-height:1.7">${escapeHtml(copy.received)}</p><p style="line-height:1.7">${escapeHtml(copy.timing)}</p><div style="margin:24px 0;padding:16px;background:#f7f5f0"><div style="font-size:12px;color:#777">${escapeHtml(copy.ref)}</div><div style="margin-top:4px;font-weight:800">${escapeHtml(input.id)}</div></div><h2 style="font-size:16px">${escapeHtml(copy.products)}</h2>${productHtml}<p style="margin-top:26px;line-height:1.7">${escapeHtml(copy.close)},<br><strong>Auctus Heritage</strong></p>`);
  const products = input.items.length ? input.items.map((item) => `- ${item.name} x ${item.quantity}`).join("\n") : isZh ? "一般咨询 / 目录申请" : "General inquiry / catalog request";
  const text = isZh ? `${copy.hello}\n\n${copy.thanks}\n\n${copy.received}\n\n${copy.timing}\n\n${copy.ref}:\n${input.id}\n\n${copy.products}:\n${products}\n\n${copy.close}\nAuctus Heritage\n由 Auctus Lab LLC 运营\n美国纽约\nhello@auctusheritage.com\nhttps://auctusheritage.com` : `${copy.hello}\n\n${copy.thanks}\n\n${copy.received}\n\n${copy.timing}\n\n${copy.ref}:\n${input.id}\n\n${copy.products}:\n${products}\n\n${copy.close},\nAuctus Heritage\nA brand operated by Auctus Lab LLC\nNew York, USA\nhello@auctusheritage.com\nhttps://auctusheritage.com`;
  return { subject, html, text };
}
