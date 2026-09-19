/** RFC-style quoted CSV, including embedded CRLF/newlines. No line splitting. */
export function parseCsv(input: string): Record<string, string>[] {
  const text = input.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false, closed = false;
  const finishField = () => { row.push(field); field = ""; closed = false; };
  const finishRow = () => { finishField(); if (row.some((value) => value !== "")) rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') { quoted = false; closed = true; }
      else field += char;
    } else if (char === ",") finishField();
    else if (char === "\r" || char === "\n") { finishRow(); if (char === "\r" && text[i + 1] === "\n") i++; }
    else if (char === '"' && !field && !closed) quoted = true;
    else { if (closed || char === '"') throw new Error("Invalid CSV quoting"); field += char; }
  }
  if (quoted) throw new Error("Unclosed quoted CSV field");
  if (field || row.length || closed) finishRow();
  if (!rows.length) throw new Error("CSV requires a header");
  const [headers, ...values] = rows;
  if (headers.some((header) => !header) || new Set(headers).size !== headers.length) throw new Error("CSV headers must be unique and nonempty");
  return values.map((values, index) => {
    if (values.length !== headers.length) throw new Error(`CSV record ${index + 2}: wrong column count`);
    return Object.fromEntries(headers.map((header, i) => [header, values[i]]));
  });
}

function normalizedName(value: string | undefined) {
  return (value || "").normalize("NFKC").toLowerCase().trim().replace(/&/g, " and ").replace(/[.'’]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function keys(row: Record<string, string>) {
  const value = row.website_url || row.website || row.Website;
  let domain = "", website = "";
  if (value) {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid institution website");
    domain = url.hostname.toLowerCase().replace(/^www\./, "");
    website = domain + url.pathname.replace(/\/+$/, "");
  }
  const name = normalizedName(row.name || row.institution_name || row["Institution Name"]);
  const city = normalizedName(row.city || row.City), state = normalizedName(row.state || row.State);
  return [["same_domain", domain], ["same_website", website], ["same_name_location", name && (city || state) ? `${name}|${city}|${state}` : ""]].filter(([, key]) => key);
}

export function mergeInstitutionRows(existing: Record<string, string>[], incoming: Record<string, string>[]) {
  const records: Record<string, string>[] = [];
  const index = new Map<string, number>();
  const duplicates: Array<{ reason: string; existingIndex: number; incoming: Record<string, string> }> = [];
  for (const row of [...existing, ...incoming]) {
    const identities = keys(row);
    if (!identities.length) throw new Error("Institution requires website or name and location");
    const firstMatch = identities.find(([kind, key]) => index.has(`${kind}:${key}`));
    const specific = identities.find(([kind, key]) => kind !== "same_domain" && index.has(`${kind}:${key}`));
    const match = specific && firstMatch && index.get(specific.join(":")) !== index.get(firstMatch.join(":")) ? specific : firstMatch;
    if (match) {
      const existingIndex = index.get(`${match[0]}:${match[1]}`)!;
      const oldKeys = keys(records[existingIndex]);
      const value = (items: string[][], kind: string) => items.find(([k]) => k === kind)?.[1];
      const sharedHost = match[0] === "same_domain" && value(identities, "same_website") !== value(oldKeys, "same_website") && value(identities, "same_name_location") !== value(oldKeys, "same_name_location");
      duplicates.push({ reason: sharedHost ? "same_domain_shared_host_review" : match[0], existingIndex, incoming: row });
      // Legacy staging import is conservative: preserve original row and duplicate evidence.
      if (!sharedHost) continue;
    }
    for (const [kind, key] of identities) if (!index.has(`${kind}:${key}`)) index.set(`${kind}:${key}`, records.length);
    records.push(row);
  }
  return { records, duplicates };
}
