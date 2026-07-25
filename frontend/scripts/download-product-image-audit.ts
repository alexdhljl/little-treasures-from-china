import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

for (const line of (await readFile(path.join(process.cwd(), ".env.local"), "utf8")).split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
  const [key, ...rest] = trimmed.split("=");
  process.env[key] ||= rest.join("=").replace(/^['"]|['"]$/g, "");
}

const selected = new Set(process.argv.slice(2));
const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const select = "slug,english_name,name,images,cover_image";
const response = await fetch(`${base}/rest/v1/products?select=${select}&status=in.(active,published)&order=slug`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
  signal: AbortSignal.timeout(30_000),
});
if (!response.ok) throw new Error(await response.text());

const products = await response.json() as Array<{
  slug: string;
  english_name: string | null;
  name: string | null;
  images: string[] | null;
  cover_image: string | null;
}>;

const outputRoot = path.resolve(process.cwd(), "..", "outputs", "site-image-audit", "source");
await mkdir(outputRoot, { recursive: true });
const downloaded = [];

for (const product of products) {
  if (selected.size && !selected.has(product.slug)) continue;
  const url = product.images?.[0] || product.cover_image;
  if (!url) continue;
  const imageResponse = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!imageResponse.ok) throw new Error(`${product.slug}: ${imageResponse.status}`);
  const contentType = imageResponse.headers.get("content-type") || "image/webp";
  const extension = contentType.includes("png") ? "png" : contentType.includes("jpeg") ? "jpg" : "webp";
  const destination = path.join(outputRoot, `${product.slug}.${extension}`);
  await writeFile(destination, new Uint8Array(await imageResponse.arrayBuffer()));
  downloaded.push({ slug: product.slug, name: product.english_name || product.name, url, destination });
}

console.log(JSON.stringify({ count: downloaded.length, downloaded }, null, 2));
