import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

type ImportProduct = {
  slug: string;
  folder_name: string;
  images: string[];
  local_images?: string[];
};

const projectRoot = path.resolve(process.cwd(), "..");
const organizedDir = path.join(projectRoot, "organized-products");
const importPath = path.join(organizedDir, "products-import.json");
const dryRun = !process.argv.includes("--write");
const shouldImportProducts = process.argv.includes("--import-products");
const bucket = "product-images";

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

function getEnv(name: string) {
  return process.env[name] || "";
}

async function uploadFile(filePath: string, objectPath: string) {
  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for uploads.",
    );
  }
  const bytes = await readFile(filePath);
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "image/webp",
      "x-upsert": "true",
    },
    body: bytes,
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Upload failed: ${objectPath}`);
  }
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
}

async function main() {
  await loadLocalEnv();
  if (!existsSync(importPath)) {
    throw new Error(`Missing products import file: ${importPath}`);
  }
  const products = JSON.parse((await readFile(importPath, "utf8")).replace(/^\uFEFF/, "")) as ImportProduct[];
  const log: Array<Record<string, unknown>> = [];

  for (const product of products) {
    const nextImages: string[] = [];
    for (const localImage of product.local_images || []) {
      if (/^https?:\/\//.test(localImage)) {
        nextImages.push(localImage);
        continue;
      }
      const filePath = path.join(organizedDir, localImage);
      const objectPath = `${product.slug}/${path.basename(localImage)}`;
      const exists = existsSync(filePath);
      log.push({ product: product.slug, filePath, objectPath, exists, action: dryRun ? "would-upload" : "upload" });
      if (!exists) {
        continue;
      }
      if (dryRun) {
        nextImages.push(`DRY_RUN_PUBLIC_URL/${objectPath}`);
      } else {
        nextImages.push(await uploadFile(filePath, objectPath));
      }
    }
    if (nextImages.length) {
      product.images = nextImages;
    }
  }

  if (!dryRun) {
    await writeFile(importPath, JSON.stringify(products, null, 2), "utf8");
  }

  console.log(JSON.stringify({
    mode: dryRun ? "dry-run" : "write",
    importPath,
    productCount: products.length,
    imageActions: log.length,
    updatedProductsImport: !dryRun,
    log,
  }, null, 2));

  if (shouldImportProducts) {
    const args = ["--experimental-strip-types", "scripts/import-products.ts"];
    if (!dryRun) {
      args.push("--write");
    }
    if (process.argv.includes("--confirm-upsert")) {
      args.push("--confirm-upsert");
    }
    const result = spawnSync(process.execPath, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    });
    process.exit(result.status || 0);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
