import { existsSync } from "node:fs";
import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

type PreviewProduct = {
  product_name: string;
  slug: string;
  source_folder: string;
  museum: string;
  collection: string;
  category: string;
  gift_occasion: string;
  estimated_price: string;
  material: string;
  dimensions: string;
  short_description: string;
  story: string;
  alt_text: string;
  tags: string[];
  images: string[];
};

const projectRoot = path.resolve(process.cwd(), "..");
const organizedDir = path.join(projectRoot, "organized-products");
const photosDir = path.join(projectRoot, "product photos");
const previewPath = path.join(organizedDir, "new-products-import-preview.json");
const publishDir = path.join(organizedDir, "publish-ready");
const bucket = "product-images";
const writeMode = process.argv.includes("--write");
const checkOnly = process.argv.includes("--check");
const prepareOnly = process.argv.includes("--prepare");
const maxImagesPerProduct = 8;
const featuredSlugs = new Set([
  "wobbling-panda-character-pen",
  "panda-expressions-eraser-set",
  "double-tailed-tiger-mini-stapler",
  "maya-sun-god-fridge-magnet",
]);

const sourceFolderNames: Record<string, string> = {
  "maya-sun-deity-bottle-opener-magnet": "2026.6.15玛雅产品",
  "chavin-totem-fridge-magnet": "2026.6.15玛雅产品",
  "andean-condor-cultural-notebook": "2026.6.15玛雅产品",
  "maya-world-tree-weekly-planner": "2026.6.15玛雅产品",
  "maya-sun-deity-graphic-t-shirt": "2026.6.15玛雅产品",
  "maya-double-sided-deity-keychain": "2026.6.15玛雅产品；2026.6.25玛雅冰箱贴、挂件",
  "3d-tennis-character-fridge-magnet": "2026.6.18网球冰箱贴",
  "maya-sun-god-fridge-magnet": "2026.6.25玛雅冰箱贴、挂件",
  "wobbling-panda-character-pen": "2026.6.29熊猫摇摇笔",
  "panda-character-signature-pen": "2026.6.30熊猫签字笔、熊猫橡皮、双尾虎订书器、小鹿订书器",
  "panda-expressions-eraser-set": "2026.6.30熊猫签字笔、熊猫橡皮、双尾虎订书器、小鹿订书器",
  "double-tailed-tiger-mini-stapler": "2026.6.30熊猫签字笔、熊猫橡皮、双尾虎订书器、小鹿订书器",
  "sleeping-deer-mini-stapler": "2026.6.30熊猫签字笔、熊猫橡皮、双尾虎订书器、小鹿订书器",
};

async function loadLocalEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  for (const line of (await readFile(envPath, "utf8")).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    process.env[key] ||= rest.join("=").replace(/^['"]|['"]$/g, "");
  }
}

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function headers(contentType = "application/json") {
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": contentType };
}

async function request(url: string, options: RequestInit = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(20_000) });
  return response;
}

async function walk(folder: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const full = path.join(folder, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (/\.(jpe?g|png|webp|heic)$/i.test(entry.name)) files.push(full);
  }
  return files;
}

function cameraToken(value: string) {
  return value.match(/7O8B\d+/i)?.[0]?.toLowerCase() || "";
}

function chooseSource(candidates: string[]) {
  return [...candidates].sort((a, b) => {
    const aCopy = /拷贝|copy/i.test(path.basename(a)) ? 1 : 0;
    const bCopy = /拷贝|copy/i.test(path.basename(b)) ? 1 : 0;
    return aCopy - bCopy || path.basename(a).length - path.basename(b).length;
  })[0];
}

function parsePrice(value: string) {
  const amounts = [...value.matchAll(/\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));
  return { min: amounts[0] || null, max: amounts[1] || amounts[0] || null };
}

async function checkSupabase(products: PreviewProduct[]) {
  const base = env("NEXT_PUBLIC_SUPABASE_URL");
  const schemaResponse = await request(`${base}/rest/v1/products?select=slug,product_name_en,needs_review,ltps_version&limit=1`, { headers: headers() });
  const schemaMessage = schemaResponse.ok ? "" : await schemaResponse.text();
  const ltpsReady = schemaResponse.ok;
  if (!ltpsReady && !schemaMessage.includes("product_name_en")) throw new Error(`Product schema check failed: ${schemaMessage}`);

  const bucketResponse = await request(`${base}/storage/v1/bucket/${bucket}`, { headers: headers() });
  if (!bucketResponse.ok) throw new Error(`Storage bucket ${bucket} is not ready: ${await bucketResponse.text()}`);

  const existingResponse = await request(`${base}/rest/v1/products?select=slug`, { headers: headers() });
  if (!existingResponse.ok) throw new Error(await existingResponse.text());
  const existing = await existingResponse.json() as Array<{ slug: string }>;
  const candidates = new Set(products.map((product) => product.slug));
  return { existing: new Set(existing.map((item) => item.slug).filter((slug) => candidates.has(slug))), ltpsReady };
}

function optimize(source: string, destination: string) {
  if (existsSync(destination)) return;
  const python = "C:/Users/alexd/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe";
  const optimizer = path.join(process.cwd(), "scripts", "optimize-image.py");
  const result = spawnSync(python, [optimizer, "--input", source, "--output", destination, "--max-width", "1600", "--quality", "88"], {
    cwd: process.cwd(), encoding: "utf8",
  });
  if (result.status !== 0) throw new Error(`Image optimization failed for ${source}: ${result.stderr}`);
}

async function uploadImage(filePath: string, objectPath: string) {
  const base = env("NEXT_PUBLIC_SUPABASE_URL");
  const bytes = await readFile(filePath);
  const response = await request(`${base}/storage/v1/object/${bucket}/${objectPath}`, {
    method: "POST",
    headers: { ...headers("image/webp"), "x-upsert": "false" },
    body: bytes,
  });
  if (!response.ok && response.status !== 409) throw new Error(`Upload failed for ${objectPath}: ${await response.text()}`);
  return `${base}/storage/v1/object/public/${bucket}/${objectPath}`;
}

function toDbRow(product: PreviewProduct, imageUrls: string[], originalFiles: string[], ltpsReady: boolean) {
  const categoryParts = product.category.split(" / ").map((part) => part.trim()).filter(Boolean);
  const price = parsePrice(product.estimated_price);
  const occasions = product.gift_occasion.split("/").map((item) => item.trim()).filter(Boolean);
  const legacyRow = {
    slug: product.slug,
    name: product.product_name,
    english_name: product.product_name,
    museum: product.museum || "Curated Selection",
    collection: product.collection || null,
    category: categoryParts[0] || "Cultural Gifts",
    price: price.min,
    currency: "USD",
    short_description: product.short_description,
    story: product.story,
    materials: product.material || null,
    dimensions: product.dimensions || "TBD",
    images: imageUrls,
    alt_text: product.alt_text,
    tags: [...(product.tags || []), "needs-review", "ai-generated"],
    occasion_tags: occasions,
    recipient_tags: [],
    gift_recommendations: occasions,
    official_collection: product.collection || null,
    inventory_status: "made_to_order",
    featured: featuredSlugs.has(product.slug),
    status: "published",
    seo_title: product.product_name.slice(0, 60),
    seo_description: product.short_description.slice(0, 160),
    shipping_note: "International shipping quoted separately.",
    return_note: "Returns and exchanges are reviewed case by case before order confirmation.",
    related_product_ids: [],
  };
  if (!ltpsReady) return legacyRow;
  return {
    ...legacyRow,
    product_name_en: product.product_name,
    product_name_zh: null,
    brand: "Little Treasures From China",
    supplier: null,
    subcategory: categoryParts.slice(1).join(" / ") || null,
    estimated_retail_price_min: price.min,
    estimated_retail_price_max: price.max,
    short_description_en: product.short_description,
    long_description_en: product.short_description,
    story_en: product.story,
    cover_image: imageUrls[0],
    gallery_images: imageUrls.slice(1),
    image_alt_en: product.alt_text,
    seo_description_en: product.short_description.slice(0, 160),
    seo_keywords: product.tags || [],
    needs_review: true,
    ai_generated: true,
    translation_checked: false,
    photo_checked: true,
    origin: "China",
    countries_available: ["US"],
    languages: ["en", "zh"],
    source_folder: sourceFolderNames[product.slug] || product.source_folder,
    original_file_names: originalFiles,
    ltps_version: "1.0",
    status: "active",
  };
}

async function insertProduct(row: Record<string, unknown>) {
  const response = await request(`${env("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/products`, {
    method: "POST",
    headers: { ...headers(), Prefer: "return=representation" },
    body: JSON.stringify(row),
  });
  if (!response.ok) throw new Error(`Product insert failed for ${row.slug}: ${await response.text()}`);
  return response.json();
}

async function main() {
  await loadLocalEnv();
  const preview = JSON.parse((await readFile(previewPath, "utf8")).replace(/^\uFEFF/, "")) as { products: PreviewProduct[] };
  const products = preview.products;
  const supabaseState = prepareOnly ? { existing: new Set<string>(), ltpsReady: false } : await checkSupabase(products);
  const existing = supabaseState.existing;
  const allPhotos = await walk(photosDir);
  const byToken = new Map<string, string[]>();
  for (const file of allPhotos) {
    const token = cameraToken(path.basename(file));
    if (!token) continue;
    byToken.set(token, [...(byToken.get(token) || []), file]);
  }

  const plan = products.map((product) => {
    const tokens = [...new Set(product.images.map(cameraToken).filter(Boolean))].slice(0, maxImagesPerProduct);
    const sources = tokens.map((token) => chooseSource(byToken.get(token) || [])).filter(Boolean);
    return { product, tokens, sources, existing: existing.has(product.slug) };
  });
  const missing = plan.filter((item) => !item.existing && item.sources.length === 0);
  if (missing.length) throw new Error(`No source images found for: ${missing.map((item) => item.product.slug).join(", ")}`);

  console.log(JSON.stringify({
    mode: prepareOnly ? "prepare" : writeMode ? "write" : checkOnly ? "check" : "dry-run",
    schemaMode: supabaseState.ltpsReady ? "LTPS v1" : "legacy-compatible",
    productCount: products.length,
    existingSlugs: plan.filter((item) => item.existing).map((item) => item.product.slug),
    plannedInserts: plan.filter((item) => !item.existing).map((item) => ({ slug: item.product.slug, imageCount: item.sources.length, featured: featuredSlugs.has(item.product.slug) })),
  }, null, 2));
  if (prepareOnly) {
    await mkdir(publishDir, { recursive: true });
    for (const item of plan) {
      const productDir = path.join(publishDir, item.product.slug);
      await mkdir(productDir, { recursive: true });
      for (let index = 0; index < item.sources.length; index += 1) {
        const filename = index === 0 ? "cover.webp" : `gallery-${String(index).padStart(2, "0")}.webp`;
        optimize(item.sources[index], path.join(productDir, filename));
      }
    }
    console.log(JSON.stringify({ prepared: true, productCount: plan.length, imageCount: plan.reduce((sum, item) => sum + item.sources.length, 0), publishDir }, null, 2));
    return;
  }
  if (!writeMode || checkOnly) return;

  await mkdir(publishDir, { recursive: true });
  const results: Array<Record<string, unknown>> = [];
  for (const item of plan) {
    if (item.existing) {
      results.push({ slug: item.product.slug, action: "skipped-existing" });
      continue;
    }
    const productDir = path.join(publishDir, item.product.slug);
    await mkdir(productDir, { recursive: true });
    const imageUrls: string[] = [];
    const originalFiles: string[] = [];
    for (let index = 0; index < item.sources.length; index += 1) {
      const source = item.sources[index];
      const filename = index === 0 ? "cover.webp" : `gallery-${String(index).padStart(2, "0")}.webp`;
      const optimized = path.join(productDir, filename);
      optimize(source, optimized);
      imageUrls.push(await uploadImage(optimized, `${item.product.slug}/${filename}`));
      originalFiles.push(path.basename(source));
    }
    const inserted = await insertProduct(toDbRow(item.product, imageUrls, originalFiles, supabaseState.ltpsReady));
    results.push({ slug: item.product.slug, action: "inserted", imageCount: imageUrls.length, id: inserted?.[0]?.id || null });
  }
  console.log(JSON.stringify({ completed: true, results }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
