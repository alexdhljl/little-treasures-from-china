"use client";

import { useEffect, useState } from "react";
import { Archive, ArrowLeft, Copy, Loader2, Mail, RefreshCw, Save, Send, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { deleteInquiry, fetchInquiry, getStoredSession, updateInquiry, type InquiryRecord, type InquiryStatus } from "@/lib/supabase-rest";

const statuses: InquiryStatus[] = ["new", "reviewing", "replied", "quote_sent", "won", "lost", "archived"];

export default function AdminInquiryDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [inquiry, setInquiry] = useState<InquiryRecord | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [message, setMessage] = useState("");
  const session = getStoredSession();

  async function load() {
    if (!session) { setMessage("Please sign in through /admin first."); setLoading(false); return; }
    setLoading(true);
    try { const row = await fetchInquiry(params.id, session.access_token); setInquiry(row); setNotes(row?.internal_notes || ""); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load inquiry."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [params.id]);

  async function save(patch: Partial<Pick<InquiryRecord, "status" | "internal_notes" | "last_contacted_at" | "archived_at">>) {
    if (!session || !inquiry) return;
    setWorking("save"); setMessage("");
    try { const updated = await updateInquiry(inquiry.id, patch, session.access_token); setInquiry((current) => current ? { ...current, ...updated } : current); setMessage("Inquiry updated."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Update failed."); }
    finally { setWorking(""); }
  }

  async function resend(kind: "notification" | "confirmation") {
    if (!session || !inquiry) return;
    setWorking(kind); setMessage("");
    try {
      const response = await fetch(`/api/admin/inquiries/${inquiry.id}/resend`, { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ kind }) });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Email resend failed.");
      setMessage(kind === "notification" ? "Internal notification resent." : "Customer confirmation resent."); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Email resend failed."); }
    finally { setWorking(""); }
  }

  async function remove() {
    if (!session || !inquiry || !window.confirm(`Permanently delete inquiry ${inquiry.id}?`)) return;
    await deleteInquiry(inquiry.id, session.access_token); router.push("/admin/inquiries");
  }

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#f5f3ed]"><Loader2 className="animate-spin" /></main>;
  if (!inquiry) return <main className="grid min-h-screen place-items-center bg-[#f5f3ed] p-5"><div className="border bg-white p-8"><p>{message || "Inquiry not found."}</p><a className="mt-4 inline-block font-bold" href="/admin/inquiries">Back to inquiries</a></div></main>;

  return <main className="min-h-screen bg-[#f5f3ed] text-[#171717]"><header className="border-b border-black/10 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6"><a href="/admin"><BrandLogo className="w-[190px]" /></a><button className="inline-flex min-h-11 items-center gap-2 border px-3 text-sm font-bold" onClick={() => void load()}><RefreshCw size={16} />Refresh</button></div></header><div className="mx-auto max-w-7xl px-4 py-8 sm:px-6"><a className="inline-flex items-center gap-2 text-sm font-bold" href="/admin/inquiries"><ArrowLeft size={16} />All inquiries</a><div className="mt-5 flex flex-wrap items-start justify-between gap-4"><div><p className="commerce-kicker">Inquiry</p><h1 className="mt-2 break-all font-mono text-xl font-black sm:text-2xl">{inquiry.id}</h1><p className="mt-2 text-sm text-[#666]">Submitted {new Date(inquiry.created_at).toLocaleString()}</p></div><select className="min-h-11 border border-black/15 bg-white px-3 text-sm font-bold" onChange={(event) => void save({ status: event.target.value as InquiryStatus, ...(event.target.value === "archived" ? { archived_at: new Date().toISOString() } : {}) })} value={inquiry.status}>{statuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></div>{message ? <p className="mt-5 border border-[#e4b44f] bg-[#fff8df] px-4 py-3 text-sm font-bold">{message}</p> : null}
    <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.75fr]"><section className="grid gap-5"><Panel title="Customer"><dl className="grid grid-cols-[130px_1fr] gap-x-4 gap-y-3 text-sm"><Row label="Name" value={inquiry.name} /><Row label="Email" value={inquiry.email} /><Row label="Company" value={inquiry.company} /><Row label="Position" value={inquiry.position || inquiry.role} /><Row label="Country" value={inquiry.country} /><Row label="Phone" value={inquiry.phone} /><Row label="Quantity" value={inquiry.estimated_quantity} /><Row label="Language" value={inquiry.preferred_language || inquiry.locale} /></dl><div className="mt-5 flex flex-wrap gap-2"><button className="inline-flex min-h-10 items-center gap-2 border px-3 text-sm font-bold" onClick={() => void navigator.clipboard.writeText(inquiry.email)}><Copy size={15} />Copy email</button><a className="inline-flex min-h-10 items-center gap-2 bg-[#171717] px-3 text-sm font-bold text-white" href={`mailto:${inquiry.email}?subject=${encodeURIComponent(`Re: Auctus Heritage inquiry ${inquiry.id}`)}`} onClick={() => void save({ last_contacted_at: new Date().toISOString() })}><Mail size={15} />Reply</a></div></Panel><Panel title="Message"><p className="whitespace-pre-wrap text-sm leading-7">{inquiry.message || "No message provided."}</p></Panel><Panel title="Selected products"><div className="grid gap-4">{inquiry.inquiry_items.length ? inquiry.inquiry_items.map((item) => <article className="grid grid-cols-[72px_1fr] gap-3 border-t pt-4 first:border-0 first:pt-0" key={item.id}><div className="aspect-[4/5] overflow-hidden bg-white">{item.image_url ? <img alt="" className="h-full w-full object-contain p-1" src={item.image_url} /> : null}</div><div><a className="font-bold text-[#2c6f6d]" href={item.product_url || `/en/products/${item.product_slug}`} target="_blank">{item.product_name}</a><p className="mt-1 text-sm">Quantity: {item.quantity}</p>{item.notes ? <p className="mt-1 text-sm text-[#666]">{item.notes}</p> : null}</div></article>) : <p className="text-sm text-[#666]">No products selected.</p>}</div></Panel></section>
    <aside className="grid content-start gap-5"><Panel title="Submission"><dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-3 text-sm"><Row label="Source" value={inquiry.submission_source || inquiry.source} /><Row label="Source page" value={inquiry.source_page} link /><Row label="Referrer" value={inquiry.referrer} link /><Row label="Last contacted" value={inquiry.last_contacted_at ? new Date(inquiry.last_contacted_at).toLocaleString() : null} /></dl></Panel><Panel title="Email delivery"><Delivery label="Internal notification" status={inquiry.notification_status} error={inquiry.notification_error} sentAt={inquiry.notification_sent_at} /><button className="mt-3 inline-flex min-h-10 items-center gap-2 border px-3 text-sm font-bold disabled:opacity-50" disabled={Boolean(working)} onClick={() => void resend("notification")}><Send size={15} />{working === "notification" ? "Sending..." : "Resend notification"}</button><div className="my-5 border-t" /><Delivery label="Customer confirmation" status={inquiry.confirmation_status} error={inquiry.confirmation_error} sentAt={inquiry.confirmation_sent_at} /><button className="mt-3 inline-flex min-h-10 items-center gap-2 border px-3 text-sm font-bold disabled:opacity-50" disabled={Boolean(working)} onClick={() => void resend("confirmation")}><Send size={15} />{working === "confirmation" ? "Sending..." : "Resend confirmation"}</button></Panel><Panel title="Internal notes"><textarea className="min-h-36 w-full border border-black/15 p-3 text-sm" onChange={(event) => setNotes(event.target.value)} value={notes} /><button className="mt-3 inline-flex min-h-10 items-center gap-2 bg-[#171717] px-3 text-sm font-bold text-white" onClick={() => void save({ internal_notes: notes })}><Save size={15} />Save notes</button></Panel><div className="flex flex-wrap gap-2"><button className="inline-flex min-h-10 items-center gap-2 border px-3 text-sm font-bold" onClick={() => void save({ status: "archived", archived_at: new Date().toISOString() })}><Archive size={15} />Archive</button><button className="inline-flex min-h-10 items-center gap-2 border border-red-300 px-3 text-sm font-bold text-red-700" onClick={() => void remove()}><Trash2 size={15} />Delete</button></div></aside></div>
  </div></main>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="border border-black/10 bg-white p-5"><h2 className="mb-4 text-lg font-black">{title}</h2>{children}</section>; }
function Row({ label, value, link = false }: { label: string; value: string | null | undefined; link?: boolean }) { return <><dt className="text-[#666]">{label}</dt><dd className="min-w-0 break-words">{value ? link ? <a className="text-[#2c6f6d] underline" href={value} rel="noreferrer" target="_blank">{value}</a> : value : "-"}</dd></>; }
function Delivery({ label, status, error, sentAt }: { label: string; status: string; error: string | null; sentAt: string | null }) { return <div><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-bold">{label}</h3><span className={`px-2 py-1 text-xs font-bold ${status === "failed" ? "bg-red-100 text-red-800" : status === "sent" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{status}</span></div>{sentAt ? <p className="mt-2 text-xs text-[#666]">Sent {new Date(sentAt).toLocaleString()}</p> : null}{error ? <p className="mt-2 break-words text-xs text-red-700">{error}</p> : null}</div>; }
