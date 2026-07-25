import { readFile } from "node:fs/promises";
import path from "node:path";

for (const line of (await readFile(path.join(process.cwd(), ".env.local"), "utf8")).split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
  const [key, ...rest] = trimmed.split("=");
  process.env[key] ||= rest.join("=").replace(/^['"]|['"]$/g, "");
}

const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const select = "id,slug,english_name,name,status,images,cover_image,gallery_images";
const response = await fetch(`${base}/rest/v1/products?select=${select}&status=in.(active,published)&order=slug`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
  signal: AbortSignal.timeout(30_000),
});
if (!response.ok) throw new Error(await response.text());

const products = await response.json() as Array<{
  id: string;
  slug: string;
  english_name: string | null;
  name: string | null;
  images: string[] | null;
  cover_image: string | null;
}>;

console.log(JSON.stringify({
  count: products.length,
  products: products.map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.english_name || product.name,
    imageCount: product.images?.length || 0,
    cover: product.images?.[0] || product.cover_image,
  })),
}, null, 2));
