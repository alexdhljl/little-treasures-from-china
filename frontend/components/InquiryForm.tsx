"use client";

import { FormEvent, useState } from "react";
import { Loader2, Send } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import type { InquiryCartItem } from "@/lib/inquiry-cart";

export function InquiryForm({ locale, items = [], source = "website", onSuccess }: { locale: Locale; items?: InquiryCartItem[]; source?: string; onSuccess?: () => void }) {
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setState("submitting");
    setError("");
    const form = new FormData(formElement);
    const payload = Object.fromEntries(form.entries());
    const response = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, locale, source, items }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error || "Unable to submit inquiry.");
      setState("error");
      return;
    }
    setState("success");
    onSuccess?.();
    formElement.reset();
  }

  if (state === "success") {
    return <div className="border border-[#2c6f6d]/30 bg-[#eef7f5] p-6"><h2 className="text-xl font-black">{locale === "zh" ? "感谢您，我们已经收到询价。" : "Thank you. We received your inquiry."}</h2><p className="mt-2 text-sm leading-6 text-[#555]">{locale === "zh" ? "我们会尽快与您联系。" : "We will contact you soon."}</p></div>;
  }

  const inputClass = "w-full border border-black/15 bg-white px-3 py-3 text-sm outline-none focus:border-[#2c6f6d]";
  return <form className="grid gap-4" onSubmit={submit}>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={locale === "zh" ? "姓名 *" : "Name *"}><input className={inputClass} name="name" required /></Field>
      <Field label={locale === "zh" ? "邮箱 *" : "Email *"}><input className={inputClass} name="email" required type="email" /></Field>
      <Field label={locale === "zh" ? "公司 / 机构" : "Company / Organization"}><input className={inputClass} name="company" /></Field>
      <Field label={locale === "zh" ? "职位" : "Role"}><input className={inputClass} name="role" /></Field>
      <Field label={locale === "zh" ? "国家 *" : "Country *"}><input className={inputClass} name="country" required /></Field>
      <Field label={locale === "zh" ? "电话" : "Phone"}><input className={inputClass} name="phone" type="tel" /></Field>
      <Field label={locale === "zh" ? "预计数量" : "Estimated Quantity"}><input className={inputClass} name="estimatedQuantity" /></Field>
    </div>
    <Field label={locale === "zh" ? "留言" : "Message"}><textarea className={inputClass} name="message" rows={5} /></Field>
    {error ? <p className="text-sm font-bold text-red-700" role="alert">{error}</p> : null}
    <button className="inline-flex min-h-12 items-center justify-center gap-2 bg-[#171717] px-6 text-sm font-black text-white disabled:opacity-60" disabled={state === "submitting"} type="submit">{state === "submitting" ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}{locale === "zh" ? "提交询价" : "Submit Inquiry"}</button>
  </form>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2"><span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#666]">{label}</span>{children}</label>;
}
