import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { seedLeads, type SeedLead } from "../data/seed-leads.ts";

const outputCsv = resolve("data/seed-leads.csv");
const outputJson = resolve("data/seed-leads.json");
const importArg = process.argv.find((arg) => arg.startsWith("--import="));

const fields: Array<keyof SeedLead> = [
  "name",
  "category",
  "subcategory",
  "city",
  "state",
  "country",
  "website_url",
  "store_url",
  "gift_shop_url",
  "online_store_url",
  "vendor_application_url",
  "wholesale_url",
  "contact_page_url",
  "general_email",
  "correct_business_email",
  "retail_contact_name",
  "retail_contact_title",
  "retail_contact_email",
  "partnership_contact_name",
  "partnership_contact_email",
  "procurement_contact_email",
  "phone",
  "LinkedIn",
  "Instagram",
  "TikTok",
  "YouTube",
  "source_url",
  "source_type",
  "evidence_notes",
  "recommended_product_angle",
  "opportunity_score",
  "confidence_score",
  "outreach_status",
  "personalized_email_draft",
];

if (importArg) {
  const csvPath = resolve(importArg.replace("--import=", ""));
  const parsed = parseCsv(readFileSync(csvPath, "utf8"));
  const importedPath = resolve("data/imported-leads.json");
  mkdirSync(dirname(importedPath), { recursive: true });
  writeFileSync(importedPath, JSON.stringify(parsed, null, 2), "utf8");
  console.log(`Imported ${parsed.length} lead rows into ${importedPath}`);
  process.exit(0);
}

mkdirSync(dirname(outputCsv), { recursive: true });
writeFileSync(outputCsv, toCsv(seedLeads), "utf8");
writeFileSync(outputJson, JSON.stringify(seedLeads, null, 2), "utf8");

const byCategory = seedLeads.reduce<Record<string, number>>((acc, lead) => {
  acc[lead.category] = (acc[lead.category] ?? 0) + 1;
  return acc;
}, {});

console.log(`Exported ${seedLeads.length} seed leads`);
console.log(`CSV: ${outputCsv}`);
console.log(`JSON: ${outputJson}`);
console.log(JSON.stringify(byCategory, null, 2));

function toCsv(rows: SeedLead[]) {
  return [fields.join(","), ...rows.map((row) => fields.map((field) => csvCell(row[field])).join(","))].join("\n");
}

function csvCell(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }
  const text = String(value).replaceAll('"', '""');
  return /[",\n]/.test(text) ? `"${text}"` : text;
}

function parseCsv(csv: string) {
  const lines = csv.trim().split(/\r?\n/);
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function splitCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}
