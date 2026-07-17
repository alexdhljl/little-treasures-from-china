"use client";

import { FormEvent, useRef, useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { TurnstileField } from "@/components/TurnstileField";
import type { Locale } from "@/lib/i18n";
import type { InquiryCartItem } from "@/lib/inquiry-cart";

type Result = {
  error?: string;
  requestId?: string;
  id?: string;
  emailDelivery?: { notification?: "sent" | "failed"; confirmation?: "sent" | "failed" };
};

export function InquiryForm({ locale, items = [], source = "general_contact", onSuccess }: { locale: Locale; items?: InquiryCartItem[]; source?: string; onSuccess?: () => void }) {
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result>({});
  const [turnstileToken, setTurnstileToken] = useState("");
  const idempotencyKey = useRef("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "submitting") return;
    const formElement = event.currentTarget;
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
    setState("submitting");
    setError("");
    try {
      const fields = Object.fromEntries(new FormData(formElement).entries());
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, locale, preferredLanguage: locale, source, items, idempotencyKey: idempotencyKey.current, turnstileToken, sourcePage: window.location.href, referrer: document.referrer }),
      });
      const body = await response.json().catch(() => ({})) as Result;
      if (!response.ok) throw new Error(`${body.error || (locale === "zh" ? "提交失败，请重试。" : "Unable to submit. Please try again.")}${body.requestId ? ` (${body.requestId})` : ""}`);
      setResult(body);
      setState("success");
      onSuccess?.();
      formElement.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : locale === "zh" ? "提交失败，请重试。" : "Unable to submit inquiry.");
      setState("error");
    }
  }

  if (state === "success") {
    const emailWarning = result.emailDelivery?.notification === "failed" || result.emailDelivery?.confirmation === "failed";
    return <div className="border border-[#2c6f6d]/30 bg-[#eef7f5] p-6" role="status"><CheckCircle2 className="text-[#2c6f6d]" size={28} /><h2 className="mt-4 text-xl font-black">{locale === "zh" ? "感谢您的询价。我们已经收到您的信息。" : "Thank you. Your inquiry has been received."}</h2>{result.id ? <p className="mt-3 text-sm font-bold">{locale === "zh" ? "询价编号" : "Reference"}: <span className="font-mono">{result.id}</span></p> : null}<p className="mt-2 text-sm leading-6 text-[#555]">{locale === "zh" ? "我们通常会在 1-2 个工作日内回复。" : "We normally respond within 1-2 business days."}</p>{emailWarning ? <p className="mt-3 text-sm leading-6 text-[#555]">{locale === "zh" ? "您的询价已成功保存，我们的团队可通过后台查看。" : "Your inquiry was saved successfully and is available to our team in the admin system."}</p> : null}</div>;
  }

  const inputClass = "w-full border border-black/15 bg-white px-3 py-3 text-sm outline-none focus:border-[#2c6f6d]";
  return <form className="grid gap-4" onSubmit={submit}>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={locale === "zh" ? "姓名 *" : "Name *"}><input autoComplete="name" className={inputClass} maxLength={100} name="name" required /></Field>
      <Field label={locale === "zh" ? "邮箱 *" : "Email *"}><input autoComplete="email" className={inputClass} maxLength={254} name="email" required type="email" /></Field>
      <Field label={locale === "zh" ? "公司 / 机构" : "Company / Organization"}><input autoComplete="organization" className={inputClass} maxLength={200} name="company" /></Field>
      <Field label={locale === "zh" ? "职位" : "Position / Role"}><input autoComplete="organization-title" className={inputClass} maxLength={150} name="position" /></Field>
      <Field label={locale === "zh" ? "国家 *" : "Country *"}><input autoComplete="country-name" className={inputClass} maxLength={100} name="country" required /></Field>
      <Field label={locale === "zh" ? "电话" : "Phone"}><input autoComplete="tel" className={inputClass} maxLength={50} name="phone" type="tel" /></Field>
      <Field label={locale === "zh" ? "预计数量" : "Estimated Quantity"}><input className={inputClass} max={1000000} min={1} name="estimatedQuantity" step={1} type="number" /></Field>
    </div>
    <Field label={locale === "zh" ? "留言" : "Message"}><textarea className={inputClass} maxLength={5000} name="message" rows={5} /></Field>
    <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden"><label>Website<input autoComplete="off" name="website" tabIndex={-1} /></label></div>
    <TurnstileField onToken={setTurnstileToken} />
    {error ? <p className="text-sm font-bold text-red-700" role="alert">{error}</p> : null}
    <button className="inline-flex min-h-12 items-center justify-center gap-2 bg-[#171717] px-6 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={state === "submitting"} type="submit">{state === "submitting" ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}{state === "submitting" ? (locale === "zh" ? "正在提交..." : "Submitting...") : (locale === "zh" ? "提交询价" : "Submit Inquiry")}</button>
  </form>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2"><span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#666]">{label}</span>{children}</label>;
}
