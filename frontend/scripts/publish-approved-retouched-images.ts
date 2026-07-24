import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

type StatusRow = {
  product_slug: string;
  product_name: string;
  output_file: string;
  role: string;
  status: string;
  notes: string;
};

type ProductRow = {
  id: string;
  slug: string;
  images: string[] | null;
  cover_image: string | null;
  gallery_images: string[] | null;
  packaging_images: string[] | null;
  lifestyle_images: string[] | null;
};

const frontendRoot = process.cwd();
const projectRoot = path.resolve(frontendRoot, "..");
const dryRun = !process.argv.includes("--write");
const includeReviewRequired = process.argv.includes("--include-review");
const bucket = "product-images";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const reviewCsvPath = path.join(projectRoot, "deliverables", "image-retouch-review", "full-batch", "image-status.csv");
const backupRoot = path.join(projectRoot, "backup", "approved-image-replacement", stamp);
const versionFolder = `retouched-${stamp.slice(0, 10)}`;
const slugAliases: Record<string, string> = {
  "double-tail-tiger-stapler": "double-tailed-tiger-mini-stapler",
};

async function loadLocalEnv() {
  const envPath = path.join(frontendRoot, ".env.local");
  if (!existsSync(envPath)) return;
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

function authHeaders(contentType = "application/json") {
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": contentType };
}

function sha256(bytes: Uint8Array) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') {
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

async function readApprovedHeroRows() {
  const raw = await readFile(reviewCsvPath, "utf8");
  const lines = raw.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])) as StatusRow;
  }).filter((row) => {
    const statusAllowed = row.status === "APPROVED" || (includeReviewRequired && row.status === "REVIEW_REQUIRED");
    return row.role === "hero" && statusAllowed && row.output_file;
  });
}

async function request(url: string, options: RequestInit = {}) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(30_000) });
}

async function fetchProduct(slug: string) {
  const base = env("NEXT_PUBLIC_SUPABASE_URL");
  const select = "id,slug,images,cover_image,gallery_images,packaging_images,lifestyle_images";
  const response = await request(`${base}/rest/v1/products?slug=eq.${encodeURIComponent(slug)}&select=${select}&limit=1`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error(`Product lookup failed for ${slug}: ${await response.text()}`);
  const rows = await response.json() as ProductRow[];
  return rows[0] || null;
}

function replaceFirstImage(product: ProductRow, nextUrl: string) {
  const currentImages = product.images?.filter(Boolean) || [];
  const currentGallery = product.gallery_images?.filter(Boolean) || [];
  const cover = product.cover_image || currentImages[0] || currentGallery[0] || "";
  const remaining = Array.from(new Set([
    ...currentImages,
    ...currentGallery,
    ...(product.packaging_images || []),
    ...(product.lifestyle_images || []),
  ].filter((url) => url && url !== cover)));
  return {
    cover_image: nextUrl,
    images: [nextUrl, ...remaining],
    gallery_images: [nextUrl, ...remaining],
    photo_checked: true,
    updated_at: new Date().toISOString(),
  };
}

async function patchProduct(slug: string, payload: Record<string, unknown>) {
  const base = env("NEXT_PUBLIC_SUPABASE_URL");
  const response = await request(`${base}/rest/v1/products?slug=eq.${encodeURIComponent(slug)}`, {
    method: "PATCH",
    headers: { ...authHeaders(), Prefer: "return=representation" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Product update failed for ${slug}: ${await response.text()}`);
  return response.json();
}

async function main() {
  await loadLocalEnv();
  const supabaseUrl = env("NEXT_PUBLIC_SUPABASE_URL");
  const rows = await readApprovedHeroRows();
  const log = [];

  for (const row of rows) {
    const productSlug = slugAliases[row.product_slug] || row.product_slug;
    const sourcePath = path.join(projectRoot, "deliverables", "image-retouch-review", "full-batch", row.output_file);
    if (!existsSync(sourcePath)) {
      log.push({ slug: row.product_slug, action: "skipped", reason: `Missing output ${row.output_file}` });
      continue;
    }

    const product = await fetchProduct(productSlug);
    if (!product) {
      log.push({ slug: row.product_slug, productName: row.product_name, action: "skipped", reason: "No matching product row in Supabase" });
      continue;
    }
    if ((product.cover_image || "").includes(versionFolder)) {
      log.push({ slug: row.product_slug, productSlug, productName: row.product_name, action: "already-current", currentCover: product.cover_image });
      continue;
    }

    const nextBytes = await readFile(sourcePath);
    const objectPath = `${productSlug}/${versionFolder}/01-main.webp`;
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
    const backupPath = path.join(backupRoot, row.product_slug, "product-row-before.json");

    if (!dryRun) {
      await mkdir(path.dirname(backupPath), { recursive: true });
      await writeFile(backupPath, JSON.stringify(product, null, 2), "utf8");

      const upload = await request(`${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`, {
        method: "POST",
        headers: { ...authHeaders("image/webp"), "x-upsert": "true" },
        body: nextBytes,
      });
      if (!upload.ok) throw new Error(`Upload failed for ${objectPath}: ${await upload.text()}`);

      const verify = await request(`${publicUrl}?verify=${Date.now()}`, { cache: "no-store" });
      if (!verify.ok) throw new Error(`Verification download failed for ${objectPath}: ${await verify.text()}`);
      const remoteSha = sha256(new Uint8Array(await verify.arrayBuffer()));
      const localSha = sha256(nextBytes);
      if (remoteSha !== localSha) throw new Error(`Remote hash mismatch for ${row.product_slug}`);

      await patchProduct(productSlug, replaceFirstImage(product, publicUrl));
      log.push({ slug: row.product_slug, productSlug, productName: row.product_name, action: "updated", publicUrl, localSha, remoteSha, backupPath });
    } else {
      log.push({ slug: row.product_slug, productSlug, productName: row.product_name, action: "would-update", publicUrl, currentCover: product.cover_image || product.images?.[0] || null, localSha: sha256(nextBytes) });
    }
  }

  if (!dryRun) {
    await mkdir(backupRoot, { recursive: true });
    await writeFile(path.join(backupRoot, "versioned-replacement-log.json"), JSON.stringify(log, null, 2), "utf8");
  }
  console.log(JSON.stringify({ mode: dryRun ? "dry-run" : "write", backupRoot, approvedHeroRows: rows.length, log }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
