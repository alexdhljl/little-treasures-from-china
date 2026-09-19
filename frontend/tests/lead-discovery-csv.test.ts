import { describe, expect, it } from "vitest";
import { readFileSync, mkdtempSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { mergeInstitutionRows, parseCsv } from "../lib/lead-discovery/csv";

describe("Lead CSV foundation", () => {
  const seedPath = resolve("data/lead-discovery/seed-leads.csv");
  it("keeps the original multiline 100-row CSV at 100 across repeated imports", () => {
    const rows = parseCsv(readFileSync(seedPath, "utf8"));
    expect(rows).toHaveLength(100);
    const first = mergeInstitutionRows([], rows);
    const repeated = mergeInstitutionRows(first.records, rows);
    expect(repeated.records).toHaveLength(100);
    expect(repeated.duplicates.filter(d => d.reason !== "same_domain_shared_host_review")).toHaveLength(100);
  });
  it("parses BOM, quoted CRLF, commas, doubled quotes, and Chinese", () => {
    expect(parseCsv('\uFEFFname,notes\r\n"文化, Museum","First\r\nSecond ""quote"""\r\n')).toEqual([{name: "文化, Museum", notes: 'First\r\nSecond "quote"'}]);
  });
  it("rejects malformed CSV instead of manufacturing institutions", () => {
    for (const text of ['name,name\nA,B', 'name,city\nA,B,C', 'name\n"open', 'name\n"A"tail']) expect(() => parseCsv(text)).toThrow();
  });
  it("normalizes scheme, www, URL path, spaces, punctuation and casing", () => {
    const first = { name: "J. Paul  Getty Museum", city: "Los Angeles", state: "CA", website: "http://www.getty.edu/" };
    expect(mergeInstitutionRows([first], [{...first, website: "https://GETTY.edu/shop/"}]).duplicates[0].reason).toBe("same_domain");
    expect(mergeInstitutionRows([first], [{...first, name: " j paul getty museum ", website: "https://other.example.org"}]).duplicates[0].reason).toBe("same_name_location");
  });
  it("exercises the actual legacy --import script twice in an isolated temporary directory", () => {
    const directory = mkdtempSync(join(tmpdir(), "lead-csv-regression-"));
    const script = resolve("scripts/discover-leads.ts");
    for (let i = 0; i < 2; i++) execFileSync(process.execPath, ["--experimental-strip-types", script, `--import=${seedPath}`], {cwd: directory, stdio: "pipe"});
    expect(JSON.parse(readFileSync(join(directory, "data/imported-leads.json"), "utf8"))).toHaveLength(100);
    expect(JSON.parse(readFileSync(join(directory, "data/import-duplicates.json"), "utf8"))).toHaveLength(103);
  });
});
