"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, Download, ExternalLink, Loader2, RefreshCw, Search, Trash2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { deleteInquiry, fetchInquiries, getStoredSession, updateInquiry, type InquiryEmailStatus, type InquiryRecord, type InquiryStatus } from "@/lib/supabase-rest";

const statuses: InquiryStatus[] = ["new", "reviewing", "replied", "quote_sent", "won", "lost", "archived"];
const emailStatuses: Array<InquiryEmailStatus | "all"> = ["all", "pending", "sent", "failed", "not_required"];
const PAGE_SIZE = 20;

export default function AdminInquiriesPage() {
  const [rows, setRows] = useState<InquiryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [notification, setNotification] = useState<InquiryEmailStatus | "all">("all");
  const [country, setCountry] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const session = getStoredSession();

  async function load() {
    if (!session) { setError("Please sign in through /admin first."); setLoading(false); return; }
    setLoading(true); setError("");
    try { setRows(await fetchInquiries(session.access_token)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load inquiries."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const countries = useMemo(() => Array.from(new Set(rows.map((row) => row.country))).sort(), [rows]);
  const filtered = useMemo(() => rows.filter((row) => {
    const haystack = `${row.id} ${row.name} ${row.email} ${row.company || ""}`.toLowerCase();
    const date = row.created_at.slice(0, 10);
    return haystack.includes(query.toLowerCase()) && (status === "all" || row.status === status) && (notification === "all" || row.notification_status === notification) && (country === "all" || row.country === country) && (!from || date >= from) && (!to || date <= to);
  }), [rows, query, status, notification, country, from, to]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function exportCsv() {
    const header = ["Created", "Inquiry ID", "Customer", "Company", "Email", "Country", "Products", "Estimated Quantity", "Status", "Notification", "Confirmation"];
    const values = filtered.map((row) => [row.created_at, row.id, row.name, row.company || "", row.email, row.country, row.inquiry_items.length, row.estimated_quantity || "", row.status, row.notification_status, row.confirmation_status]);
    const csv = [header, ...values].map((cells) => cells.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); link.download = `auctus-heritage-inquiries-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(link.href);
  }

  async function archive(row: InquiryRecord) {
    if (!session) return;
    await updateInquiry(row.id, { status: "archived", archived_at: new Date().toISOString() }, session.access_token);
    await load();
  }

  async function remove(row: InquiryRecord) {
    if (!session || !window.confirm(`Permanently delete inquiry ${row.id}?`)) return;
    await deleteInquiry(row.id, session.access_token); await load();
  }

  const selectClass = "min-h-11 border border-black/15 bg-white px-3 text-sm";
  return <main className="min-h-screen bg-[#f5f3ed] text-[#171717]"><header className="border-b border-black/10 bg-white"><div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-4 sm:px-6"><a href="/admin"><BrandLogo className="w-[155px]" /></a><div className="flex gap-2"><button className="inline-flex min-h-11 items-center gap-2 border border-black/15 px-3 text-sm font-bold" onClick={() => void load()} type="button"><RefreshCw size={16} />Refresh</button><button className="inline-flex min-h-11 items-center gap-2 bg-[#171717] px-3 text-sm font-bold text-white" onClick={exportCsv} type="button"><Download size={16} />CSV</button></div></div></header><div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6"><div className="flex items-end justify-between"><div><p className="commerce-kicker">Admin CMS</p><h1 className="mt-2 text-3xl font-black">Inquiries</h1><p className="mt-2 text-sm text-[#666]">{filtered.length} of {rows.length} inquiries</p></div><a className="inline-flex items-center gap-1 text-sm font-bold" href="/admin">CMS Home<ExternalLink size={14} /></a></div>
    <div className="mt-6 grid gap-3 border border-black/10 bg-white p-4 md:grid-cols-2 xl:grid-cols-6"><label className="relative xl:col-span-2"><Search className="absolute left-3 top-3.5" size={16} /><input className="min-h-11 w-full border border-black/15 pl-9 pr-3 text-sm" onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="ID, name, email, or company" value={query} /></label><select aria-label="Inquiry status" className={selectClass} onChange={(event) => { setStatus(event.target.value); setPage(1); }} value={status}><option value="all">All statuses</option>{statuses.map((value) => <option key={value} value={value}>{value}</option>)}</select><select aria-label="Notification status" className={selectClass} onChange={(event) => { setNotification(event.target.value as InquiryEmailStatus | "all"); setPage(1); }} value={notification}>{emailStatuses.map((value) => <option key={value} value={value}>{value === "all" ? "All notifications" : value}</option>)}</select><select aria-label="Country" className={selectClass} onChange={(event) => { setCountry(event.target.value); setPage(1); }} value={country}><option value="all">All countries</option>{countries.map((value) => <option key={value}>{value}</option>)}</select><div className="grid grid-cols-2 gap-2"><input aria-label="From date" className={selectClass} onChange={(event) => setFrom(event.target.value)} type="date" value={from} /><input aria-label="To date" className={selectClass} onChange={(event) => setTo(event.target.value)} type="date" value={to} /></div></div>
    {error ? <p className="mt-5 border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}{loading ? <div className="grid min-h-64 place-items-center"><Loader2 className="animate-spin" /></div> : <div className="mt-5 overflow-x-auto border border-black/10 bg-white"><table className="w-full min-w-[1180px] text-left text-sm"><thead className="bg-[#171717] text-white"><tr>{["Date", "Inquiry ID", "Customer", "Company", "Country", "Products", "Quantity", "Status", "Notification", "Confirmation", "Actions"].map((label) => <th className="px-3 py-3 text-xs uppercase" key={label}>{label}</th>)}</tr></thead><tbody>{visible.map((row) => <tr className="border-b border-black/10" key={row.id}><td className="px-3 py-3">{new Date(row.created_at).toLocaleDateString()}</td><td className="max-w-32 truncate px-3 py-3 font-mono text-xs" title={row.id}>{row.id.slice(0, 8)}</td><td className="px-3 py-3"><p className="font-bold">{row.name}</p><p className="text-xs text-[#666]">{row.email}</p></td><td className="px-3 py-3">{row.company || "-"}</td><td className="px-3 py-3">{row.country}</td><td className="px-3 py-3">{row.inquiry_items.length}</td><td className="px-3 py-3">{row.estimated_quantity || "-"}</td><td className="px-3 py-3"><Status value={row.status} /></td><td className="px-3 py-3"><Status value={row.notification_status} /></td><td className="px-3 py-3"><Status value={row.confirmation_status} /></td><td className="px-3 py-3"><div className="flex gap-1"><a aria-label="View inquiry" className="grid size-9 place-items-center border" href={`/admin/inquiries/${row.id}`}><ExternalLink size={15} /></a><button aria-label="Archive inquiry" className="grid size-9 place-items-center border" onClick={() => void archive(row)} type="button"><Archive size={15} /></button><button aria-label="Delete inquiry" className="grid size-9 place-items-center border text-red-700" onClick={() => void remove(row)} type="button"><Trash2 size={15} /></button></div></td></tr>)}</tbody></table>{!visible.length ? <p className="p-8 text-center text-sm text-[#666]">No inquiries match these filters.</p> : null}</div>}
    <div className="mt-4 flex items-center justify-between text-sm"><span>Page {page} of {pageCount}</span><div className="flex gap-2"><button className="border bg-white px-3 py-2 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><button className="border bg-white px-3 py-2 disabled:opacity-40" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}>Next</button></div></div>
  </div></main>;
}

function Status({ value }: { value: string }) {
  const tone = value === "failed" ? "bg-red-100 text-red-800" : value === "sent" || value === "won" ? "bg-emerald-100 text-emerald-800" : value === "pending" || value === "new" ? "bg-amber-100 text-amber-900" : "bg-[#efede7] text-[#444]";
  return <span className={`inline-flex px-2 py-1 text-xs font-bold ${tone}`}>{value.replaceAll("_", " ")}</span>;
}
