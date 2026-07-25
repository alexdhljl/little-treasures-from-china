import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env.local");
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const match = line.match(/^([^#=\s]+)=(.*)$/);
  if (match) process.env[match[1]] ??= match[2].replace(/^['"]|['"]$/g, "");
}

const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

const response = await fetch(`${base}/rest/v1/products?slug=eq.sun-wukong-figurine`, {
  method: "PATCH",
  headers,
  body: JSON.stringify({ status: "active", updated_at: new Date().toISOString() }),
});
if (!response.ok) throw new Error(await response.text());
console.log(JSON.stringify(await response.json(), null, 2));
