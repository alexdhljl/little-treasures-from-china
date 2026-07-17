"use client";

import { InquiryForm } from "@/components/InquiryForm";
import type { Locale } from "@/lib/i18n";

export function ContactInquiryPanel({ locale }: { locale: Locale }) {
  return <div className="border border-black/10 bg-[#f7f5f0] p-5 sm:p-6"><h2 className="text-2xl font-black">{locale === "zh" ? "联系我们" : "Tell us what you need"}</h2><p className="mt-3 text-sm leading-6 text-[#555]">{locale === "zh" ? "目录申请、产品报价和批发咨询都会保存在我们的询价系统中。" : "Catalog requests, product quotes, and wholesale inquiries are saved securely for our team."}</p><div className="mt-5"><InquiryForm locale={locale} source="general_contact" /></div></div>;
}
