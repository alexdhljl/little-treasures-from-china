import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

type ImportProduct = {
  slug: string;
  name: string;
  englishName: string;
  category: string;
  collection: string;
  museum: string;
  region?: string;
  province: string;
  city: string;
  price: number | null;
  currency: string;
  shortDescription: string;
  story: string;
  images: string[];
  tags: string[];
  occasion_tags: string[];
  recipient_tags: string[];
  inventoryStatus: string;
  needs_manual_review?: boolean;
};

const projectRoot = path.resolve(process.cwd(), "..");
const importPath = path.join(projectRoot, "organized-products", "products-import.json");
const dryRun = !process.argv.includes("--write");
const confirmUpsert = process.argv.includes("--confirm-upsert");

async function loadLocalEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    return;
  }
  const lines = (await readFile(envPath, "utf8")).split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }
    const [key, ...rest] = trimmed.split("=");
    process.env[key] ||= rest.join("=").replace(/^['"]|['"]$/g, "");
  }
}

function env(name: string) {
  return process.env[name] || "";
}

function headers() {
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!env("NEXT_PUBLIC_SUPABASE_URL") || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for product import.",
    );
  }
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

function toDbRow(product: ImportProduct) {
  return {
    slug: product.slug,
    name: product.name || product.englishName,
    english_name: product.englishName,
    museum: product.museum || null,
    region: product.region || null,
    province: product.province || null,
    city: product.city || null,
    category: product.category || null,
    collection: product.collection || null,
    price: product.price,
    currency: product.currency || "USD",
    short_description: product.shortDescription || null,
    story: product.story || null,
    materials: null,
    dimensions: null,
    weight: null,
    images: product.images || [],
    tags: product.tags || [],
    occasion_tags: product.occasion_tags || [],
    recipient_tags: product.recipient_tags || [],
    gift_recommendations: [],
    official_collection: product.collection || null,
    inventory_status: product.inventoryStatus || "made_to_order",
    featured: false,
    related_product_ids: [],
    shipping_note: "International shipping quoted separately.",
    return_note: "Returns and exchanges are reviewed case by case before order confirmation.",
  };
}

async function getExistingProduct(slug: string) {
  const response = await fetch(
    `${env("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/products?slug=eq.${encodeURIComponent(slug)}&select=id,slug&limit=1`,
    { headers: headers() },
  );
  if (!response.ok) {
    throw new Error(await response.text());
  }
  const rows = (await response.json()) as Array<{ id: string; slug: string }>;
  return rows[0] || null;
}

async function upsertProduct(product: ImportProduct) {
  const row = toDbRow(product);
  const skippedColumns: string[] = [];

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await fetch(
      `${env("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/products?on_conflict=slug`,
      {
        method: "POST",
        headers: {
          ...headers(),
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify(row),
      },
    );
    if (response.ok) {
      return { rows: await response.json(), skippedColumns };
    }

    const message = await response.text();
    const missingColumn = message.match(/Could not find the '([^']+)' column/)?.[1];
    if (!missingColumn || !(missingColumn in row)) {
      throw new Error(message);
    }
    delete row[missingColumn as keyof typeof row];
    skippedColumns.push(missingColumn);
  }

  throw new Error("Too many missing columns while importing products.");
}

async function main() {
  await loadLocalEnv();
  if (!existsSync(importPath)) {
    throw new Error(`Missing products import file: ${importPath}`);
  }
  const products = JSON.parse((await readFile(importPath, "utf8")).replace(/^\uFEFF/, "")) as ImportProduct[];
  const log: Array<Record<string, unknown>> = [];

  for (const product of products) {
    if (product.needs_manual_review) {
      log.push({ slug: product.slug, action: "skip", reason: "needs_manual_review" });
      continue;
    }
    const existing = dryRun ? null : await getExistingProduct(product.slug);
    if (existing && !confirmUpsert) {
      log.push({ slug: product.slug, action: "skip", reason: "existing_slug_requires_confirm_upsert" });
      continue;
    }
    log.push({
      slug: product.slug,
      action: dryRun ? "would-upsert" : existing ? "update" : "insert",
      imageCount: product.images?.length || 0,
    });
    if (!dryRun) {
      await upsertProduct(product);
    }
  }

  console.log(JSON.stringify({
    mode: dryRun ? "dry-run" : "write",
    confirmUpsert,
    importPath,
    totalProducts: products.length,
    log,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
