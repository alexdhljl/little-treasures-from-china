import crypto from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type ProductRow = {
  id: string;
  slug: string;
  status: string;
  images: string[] | null;
  cover_image: string | null;
  gallery_images: string[] | null;
  packaging_images: string[] | null;
  lifestyle_images: string[] | null;
};

const frontendRoot = process.cwd();
const projectRoot = path.resolve(frontendRoot, "..");
const dryRun = !process.argv.includes("--write");
const bucket = "product-images";
const version = "site-polish-2026-07-24";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupRoot = path.join(projectRoot, "backup", "site-image-polish", stamp);

for (const line of (await readFile(path.join(frontendRoot, ".env.local"), "utf8")).split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
  const [key, ...rest] = trimmed.split("=");
  process.env[key] ||= rest.join("=").replace(/^['"]|['"]$/g, "");
}

const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };

async function request(url: string, init: RequestInit = {}) {
  return fetch(url, { ...init, signal: AbortSignal.timeout(30_000) });
}

async function fetchProduct(slug: string) {
  const select = "id,slug,status,images,cover_image,gallery_images,packaging_images,lifestyle_images";
  const response = await request(`${base}/rest/v1/products?slug=eq.${encodeURIComponent(slug)}&select=${select}&limit=1`, { headers });
  if (!response.ok) throw new Error(`${slug}: ${await response.text()}`);
  return (await response.json() as ProductRow[])[0] || null;
}

async function patchProduct(slug: string, payload: Record<string, unknown>) {
  const response = await request(`${base}/rest/v1/products?slug=eq.${encodeURIComponent(slug)}`, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify({ ...payload, updated_at: new Date().toISOString() }),
  });
  if (!response.ok) throw new Error(`${slug}: ${await response.text()}`);
  return response.json();
}

async function upload(slug: string, source: string) {
  if (!existsSync(source)) throw new Error(`Missing ${source}`);
  const bytes = await readFile(source);
  const objectPath = `${slug}/${version}/01-main.png`;
  const response = await request(`${base}/storage/v1/object/${bucket}/${objectPath}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "image/png", "x-upsert": "true" },
    body: bytes,
  });
  if (!response.ok) throw new Error(`${objectPath}: ${await response.text()}`);
  const publicUrl = `${base}/storage/v1/object/public/${bucket}/${objectPath}`;
  const verify = await request(`${publicUrl}?verify=${Date.now()}`, { cache: "no-store" });
  if (!verify.ok) throw new Error(`Verify failed: ${publicUrl}`);
  const localSha = crypto.createHash("sha256").update(bytes).digest("hex");
  const remoteSha = crypto.createHash("sha256").update(new Uint8Array(await verify.arrayBuffer())).digest("hex");
  if (localSha !== remoteSha) throw new Error(`Hash mismatch: ${slug}`);
  return { publicUrl, localSha, remoteSha };
}

const slugs = ["leopard-plush-pendant", "heritage-character-pencil-set", "wukong-fridge-magnet", "sun-wukong-figurine"];
const products = Object.fromEntries(await Promise.all(slugs.map(async (slug) => [slug, await fetchProduct(slug)])));
if (Object.values(products).some((product) => !product)) throw new Error("One or more merge products are missing.");

const planned = {
  leopard: path.join(projectRoot, "outputs", "site-image-audit", "final", "leopard-plush-pendant.png"),
  pencil: path.join(projectRoot, "outputs", "site-image-audit", "final", "heritage-character-pencil-set.png"),
};

if (dryRun) {
  console.log(JSON.stringify({ mode: "dry-run", backupRoot, products, planned }, null, 2));
  process.exit(0);
}

await mkdir(backupRoot, { recursive: true });
for (const [slug, product] of Object.entries(products)) {
  await writeFile(path.join(backupRoot, `${slug}.json`), JSON.stringify(product, null, 2), "utf8");
}

const leopardUpload = await upload("leopard-plush-pendant", planned.leopard);
const pencilUpload = await upload("heritage-character-pencil-set", planned.pencil);
const leopard = products["leopard-plush-pendant"]!;
const pencil = products["heritage-character-pencil-set"]!;
const wukong = products["wukong-fridge-magnet"]!;
const sun = products["sun-wukong-figurine"]!;

await patchProduct(leopard.slug, {
  cover_image: leopardUpload.publicUrl,
  images: [leopardUpload.publicUrl],
  gallery_images: [],
  photo_checked: true,
});

const pencilRemaining = Array.from(new Set([
  ...(pencil.images || []).slice(1),
  ...(pencil.gallery_images || []),
  ...(pencil.packaging_images || []),
  ...(pencil.lifestyle_images || []),
].filter(Boolean)));
await patchProduct(pencil.slug, {
  cover_image: pencilUpload.publicUrl,
  images: [pencilUpload.publicUrl, ...pencilRemaining],
  gallery_images: pencilRemaining,
  photo_checked: true,
});

const sunImages = sun.images?.filter(Boolean) || [];
const wukongImages = wukong.images?.filter(Boolean) || [];
const mergedImages = Array.from(new Set([...sunImages, ...wukongImages]));
await patchProduct(wukong.slug, {
  cover_image: mergedImages[0],
  images: mergedImages,
  gallery_images: mergedImages.slice(1),
  photo_checked: true,
});
await patchProduct(sun.slug, { status: "hidden" });

const log = {
  mode: "write",
  backupRoot,
  leopard: leopardUpload,
  pencil: pencilUpload,
  merge: { source: sun.slug, destination: wukong.slug, mergedImageCount: mergedImages.length, sourceStatus: "hidden" },
};
await writeFile(path.join(backupRoot, "publish-log.json"), JSON.stringify(log, null, 2), "utf8");
console.log(JSON.stringify(log, null, 2));
