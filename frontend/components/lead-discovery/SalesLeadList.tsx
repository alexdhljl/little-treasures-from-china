"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const API = "http://127.0.0.1:8000/api/v1/sales-leads";
type Lead = {
  id: string; institution_name: string | null; institution_type: string | null;
  website: string | null; city: string | null; state: string | null; country: string | null;
  email: string | null; phone: string | null; source_url: string | null; contact_page: string | null;
  reason_to_contact: string | null; assigned_salesperson: string | null; status: string;
  notes: string | null; review_status: string; revision: number; missing_requirements: string[];
};
type Page = { items: Lead[]; total: number };
type Duplicate = { fingerprint: string; reason: string; needs_review: number; incoming: { institution_name: string } };

async function request(path: string, method = "GET", body?: unknown) {
  const response = await fetch(`${API}${path}`, {
    method, headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(typeof result.detail === "string" ? result.detail : "请求未通过校验，请检查导入字段或刷新列表。");
  return result;
}

export default function SalesLeadList() {
  const [page, setPage] = useState<Page>({ items: [], total: 0 });
  const [offset, setOffset] = useState(0);
  const [query, setQuery] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [owners, setOwners] = useState("Sales A, Sales B, Sales C, Sales D, Sales E");
  const [target, setTarget] = useState(100);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  const [filters, setFilters] = useState({ query: "", owner: "" });
  const [edit, setEdit] = useState<Lead | null>(null);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("new");
  const loadSequence = useRef(0);
  const reload = useCallback(async () => {
    const sequence = ++loadSequence.current;
    const params = new URLSearchParams({ limit: "100", offset: String(offset), query: filters.query });
    if (filters.owner) params.set("assigned_salesperson", filters.owner.trim().toLowerCase());
    const result = await request(`?${params}`);
    if (sequence === loadSequence.current) { setPage(result); setSelected([]); }
  }, [offset, filters]);
  useEffect(() => { reload().catch(error => setMessage(error.message)); }, [reload]);

  async function act(work: () => Promise<string>) {
    setBusy(true); setMessage("");
    try { setMessage(await work()); await reload(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "操作失败"); await reload().catch(() => {}); }
    finally { setBusy(false); }
  }
  async function showImport(result: { created: number; duplicates: number; review_required: number }) {
    setDuplicates((await request("/duplicates")).items);
    return `新增 ${result.created}；重复 ${result.duplicates}；身份冲突待审核 ${result.review_required}。导入不会自动确认官网或分配销售。`;
  }
  const button = "border-2 border-black px-3 py-2 font-semibold disabled:opacity-40";
  return (
    <main className="min-h-screen bg-[#fbfaf7] p-6 text-neutral-900">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <Link href="/lead-discovery" className="underline">← 返回文化商业数据库</Link>
        <h1 className="text-3xl font-bold">销售机构名单</h1>
        <p>先核对机构名称、地区与官网或可信公开来源，再分配销售。邮箱和负责人允许为空；联系方式均未核验。</p>
        <div className="flex flex-wrap gap-3">
          <button className={button} disabled={busy} onClick={() => act(async () => showImport(await request("/import/seeds", "POST")))}>导入原有 100 条 seed</button>
          <label className={button}>导入 CSV
            <input className="ml-3 max-w-60" aria-label="导入 CSV" type="file" accept=".csv,text/csv" disabled={busy} onChange={event => {
              const file = event.target.files?.[0]; event.target.value = "";
              if (file) act(async () => showImport(await request("/import/csv", "POST", { content: await file.text() })));
            }} />
          </label>
          <a className={button} href={`${API}/export.csv${filters.owner ? `?assigned_salesperson=${encodeURIComponent(filters.owner.trim().toLowerCase())}` : ""}`}>导出 {filters.owner ? "此销售的" : "全部"} CSV</a>
        </div>
        <p className="text-sm text-neutral-600">CSV 含 UTF-8 BOM，适合 Excel；导出保留审核状态。筛选名称只影响页面，导出按销售筛选。身份冲突不会覆盖已有机构。</p>
        <form className="flex flex-wrap gap-3" onSubmit={event => { event.preventDefault(); setOffset(0); setFilters({ query, owner: ownerFilter }); }}>
          <input aria-label="名称或地区" placeholder="名称或地区" className="border p-2" value={query} onChange={e => setQuery(e.target.value)} />
          <input aria-label="销售筛选" placeholder="销售名称（可空）" className="border p-2" value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)} />
          <button className={button} disabled={busy}>筛选</button>
        </form>
        <section className="space-y-3 border-2 border-black bg-white p-4" aria-label="销售分配">
          <h2 className="text-xl font-bold">销售分配</h2>
          <label className="block">销售人员（逗号分隔）<input className="ml-3 w-full max-w-lg border p-2" value={owners} onChange={e => setOwners(e.target.value)} /></label>
          <label>每人目标数量<input className="mx-3 w-24 border p-2" type="number" min={1} max={10000} value={target} onChange={e => setTarget(Number(e.target.value))} /></label>
          <button className={button} disabled={busy} onClick={() => act(async () => {
            const result = await request("/assign", "POST", { salespeople: owners.split(/[,，]/).map(s => s.trim()).filter(Boolean), target_per_person: target });
            return `本次分配 ${result.assigned_now}。总数：${JSON.stringify(result.counts)}；缺口：${JSON.stringify(result.shortfall)}。`;
          })}>分配已审核、未分配机构</button>
          <p className="text-sm">不会覆盖已有负责人；人数或数量不足时只报告缺口，不生成或复制客户。</p>
        </section>
        <div role="status" aria-live="polite" className="whitespace-pre-wrap border-l-4 border-[#00a6a6] bg-white p-3">{message || `共 ${page.total} 个机构`}</div>
        <button className={button} disabled={busy || !selected.length} onClick={() => act(async () => {
          let count = 0;
          try {
            for (const lead of page.items.filter(lead => selected.includes(lead.id))) {
              await request(`/${lead.id}`, "PATCH", { revision: lead.revision, review_status: "approved" }); count++;
            }
          } catch (error) { throw new Error(`已保存 ${count} 个审核；其余未完成。${error instanceof Error ? error.message : "请刷新后重试"}`); }
          return `已记录 ${count} 个机构的人工审核。此操作不表示 Contact verified。`;
        })}>确认所选机构的官网/公开来源已人工核实（{selected.length}）</button>
        <div className="overflow-x-auto border bg-white">
          <table className="w-full text-left text-sm">
            <thead><tr className="bg-neutral-100">{["选择", "机构", "地区 / 类型", "官网 / 来源", "公开联系方式", "负责人 / 状态", "审核 / 操作"].map(t => <th key={t} className="p-3">{t}</th>)}</tr></thead>
            <tbody>{page.items.map(lead => <tr key={lead.id} className="border-t align-top">
              <td className="p-3"><input type="checkbox" aria-label={`选择 ${lead.institution_name}`} disabled={busy || !!lead.missing_requirements.length} checked={selected.includes(lead.id)} onChange={e => setSelected(ids => e.target.checked ? [...ids, lead.id] : ids.filter(id => id !== lead.id))} /></td>
              <td className="p-3 font-semibold">{lead.institution_name || "待补充名称"}<p className="mt-1 font-normal text-neutral-500">{lead.reason_to_contact}</p></td>
              <td className="p-3">{[lead.city, lead.state, lead.country].filter(Boolean).join(", ")}<p>{lead.institution_type || "待分类"}</p></td>
              <td className="p-3">{lead.website && <a className="underline" href={lead.website} target="_blank" rel="noreferrer">官网候选</a>}{lead.source_url && <p><a className="underline" href={lead.source_url} target="_blank" rel="noreferrer">公开来源</a></p>}{lead.contact_page && <p><a className="underline" href={lead.contact_page} target="_blank" rel="noreferrer">联系页</a></p>}</td>
              <td className="p-3">{lead.email || "邮箱未找到"}<p>{lead.phone || "电话未找到"}</p></td>
              <td className="p-3">{lead.assigned_salesperson || "未分配"}<p>{lead.status}</p></td>
              <td className="space-y-2 p-3"><p>{lead.review_status === "approved" ? "机构来源已审核" : "待人工审核"}</p>{!!lead.missing_requirements.length && <p>待补充：{lead.missing_requirements.join(", ")}</p>}<button className="underline" onClick={() => { setEdit(lead); setNote(lead.notes || ""); setStatus(lead.status); }}>编辑状态/备注</button></td>
            </tr>)}</tbody>
          </table>
          {!page.items.length && <p className="p-6">没有名单。可导入已有 seed 或机构 CSV；此页面不会调用搜索 API。</p>}
        </div>
        <div className="flex gap-4"><button className={button} disabled={busy || offset === 0} onClick={() => setOffset(Math.max(0, offset - 100))}>上一页</button><span>{page.total ? offset + 1 : 0}–{Math.min(offset + 100, page.total)} / {page.total}</span><button className={button} disabled={busy || offset + 100 >= page.total} onClick={() => setOffset(offset + 100)}>下一页</button></div>
        {!!duplicates.length && <details><summary>最近重复记录及原因（最多 100 条）</summary><ul>{duplicates.map(d => <li key={d.fingerprint}>{d.incoming.institution_name} — {d.reason}{d.needs_review ? "；身份冲突，未合并，原始输入已保留" : "；已去重"}</li>)}</ul></details>}
        {edit && <section className="space-y-3 border-2 border-black bg-white p-4" aria-label="编辑机构状态">
          <h2 className="font-bold">{edit.institution_name}</h2>
          <label>状态<select aria-label="状态" className="ml-3 border p-2" value={status} onChange={e => setStatus(e.target.value)}>{["new", "reviewing", "ready", "contacted", "follow_up", "qualified", "disqualified", "archived"].map(s => <option key={s}>{s}</option>)}</select></label>
          <label className="block">备注<textarea aria-label="备注" className="block w-full border p-2" value={note} onChange={e => setNote(e.target.value)} /></label>
          <button className={button} disabled={busy} onClick={() => act(async () => { await request(`/${edit.id}`, "PATCH", { revision: edit.revision, status, notes: note }); setEdit(null); return "状态和备注已保存。"; })}>保存状态和备注</button>
          <button className="ml-4 underline" onClick={() => setEdit(null)}>取消</button>
        </section>}
      </div>
    </main>
  );
}
