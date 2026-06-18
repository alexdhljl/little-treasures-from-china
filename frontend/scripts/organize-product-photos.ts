import { copyFile, mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

type PlannedImage = {
  originalPath: string;
  originalFileName: string;
  role: string;
  copiedFile?: string;
  webFile: string;
  thumbnailFile: string;
};

type PlannedProduct = {
  slug: string;
  folder_name: string;
  name: string;
  englishName: string;
  category: string;
  collection: string;
  museum: string;
  province: string;
  city: string;
  price: null;
  currency: "USD";
  shortDescription: string;
  story: string;
  images: string[];
  local_images: string[];
  tags: string[];
  occasion_tags: string[];
  recipient_tags: string[];
  inventoryStatus: "made_to_order";
  needs_manual_review: boolean;
  source_files: string[];
  planned_images: PlannedImage[];
};

const projectRoot = path.resolve(process.cwd(), "..");
const sourceDir = path.join(projectRoot, "product photos");
const outputDir = path.join(projectRoot, "organized-products");
const proposedGroupsPath = path.join(outputDir, "proposed-groups.json");
const supportedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic"]);
const roleNames = ["main", "detail", "package"] as const;
const dryRun = !process.argv.includes("--write");
const groupSizeArg = process.argv.find((arg) => arg.startsWith("--group-size="));
const groupSize = groupSizeArg ? Number(groupSizeArg.split("=")[1]) || 3 : 3;
const pythonPath =
  process.env.PYTHON_PATH ||
  "C:\\Users\\alexd\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";

function isLikelyMeaningfulName(fileName: string) {
  const base = path.basename(fileName, path.extname(fileName));
  if (/^微信图片_\d+_\d+_\d+$/i.test(base)) {
    return false;
  }
  if (/^(img|dsc|pxl|wechat|wx)[-_]?\d+/i.test(base)) {
    return false;
  }
  return /[a-zA-Z]{4,}|[\u4e00-\u9fff]{2,}/.test(base.replace(/\d/g, ""));
}

function slugFromName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function walkImages(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return walkImages(fullPath);
      }
      if (entry.isFile() && supportedExtensions.has(path.extname(entry.name).toLowerCase())) {
        return [fullPath];
      }
      return [];
    }),
  );
  return files.flat();
}

function csvEscape(value: string | number | boolean) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

async function optimizeImage(input: string, output: string, maxWidth: number) {
  const result = spawnSync(
    pythonPath,
    [
      path.join(process.cwd(), "scripts", "optimize-image.py"),
      "--input",
      input,
      "--output",
      output,
      "--max-width",
      String(maxWidth),
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `Image optimization failed for ${input}`);
  }
}

function makePlan(files: string[]) {
  const sorted = [...files].sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
  const allMeaningful = sorted.every((file) => isLikelyMeaningfulName(path.basename(file)));
  const groups: string[][] = [];

  if (allMeaningful) {
    const byBase = new Map<string, string[]>();
    for (const file of sorted) {
      const base = path
        .basename(file, path.extname(file))
        .replace(/[-_ ]?(main|front|back|detail|package|pkg|包装|正面|背面)$/i, "");
      const slug = slugFromName(base) || `product-review-${String(byBase.size + 1).padStart(3, "0")}`;
      byBase.set(slug, [...(byBase.get(slug) || []), file]);
    }
    groups.push(...byBase.values());
  } else {
    for (let index = 0; index < sorted.length; index += groupSize) {
      groups.push(sorted.slice(index, index + groupSize));
    }
  }

  return groups.map((group, productIndex): PlannedProduct => {
    const reviewNumber = String(productIndex + 1).padStart(3, "0");
    const folderName = allMeaningful
      ? slugFromName(path.basename(group[0], path.extname(group[0]))) || `product-review-${reviewNumber}`
      : `product-review-${reviewNumber}`;
    const detectedName = allMeaningful
      ? path.basename(group[0], path.extname(group[0])).replace(/[-_]+/g, " ")
      : `Manual Review Product ${reviewNumber}`;
    const plannedImages = group.map((file, imageIndex) => {
      const role = roleNames[Math.min(imageIndex, roleNames.length - 1)];
      const stem = `${String(imageIndex + 1).padStart(2, "0")}-${role}`;
      return {
        originalPath: file,
        originalFileName: path.basename(file),
        role,
        copiedFile: `${stem}${path.extname(file).toLowerCase()}`,
        webFile: `web/${stem}.webp`,
        thumbnailFile: `thumbs/${stem}-thumb.webp`,
      };
    });

    return {
      slug: folderName,
      folder_name: folderName,
      name: "",
      englishName: detectedName,
      category: "",
      collection: "",
      museum: "",
      province: "",
      city: "",
      price: null,
      currency: "USD",
      shortDescription: "",
      story: "",
      images: [],
      local_images: plannedImages.map((image) => path.posix.join(folderName, image.webFile)),
      tags: [],
      occasion_tags: [],
      recipient_tags: [],
      inventoryStatus: "made_to_order",
      needs_manual_review: !allMeaningful,
      source_files: group.map((file) => path.relative(projectRoot, file)),
      planned_images: plannedImages,
    };
  });
}

function hydrateProductImages(products: PlannedProduct[]) {
  return products.map((product) => {
    const plannedImages = product.planned_images.map((image, imageIndex) => {
      const role = image.role || roleNames[Math.min(imageIndex, roleNames.length - 1)];
      const stem = `${String(imageIndex + 1).padStart(2, "0")}-${role}`;
      const webFile = image.webFile || `web/${stem}.webp`;
      const thumbnailFile = image.thumbnailFile || `thumbs/${stem}-thumb.webp`;
      return {
        ...image,
        role,
        copiedFile:
          image.copiedFile ||
          `${path.basename(webFile, path.extname(webFile))}${path.extname(image.originalPath).toLowerCase()}`,
        webFile,
        thumbnailFile,
      };
    });

    return {
      ...product,
      images: product.images || [],
      local_images: plannedImages.map((image) => path.posix.join(product.folder_name, image.webFile)),
      planned_images: plannedImages,
    };
  });
}

async function writePlanFiles(products: PlannedProduct[]) {
  await mkdir(outputDir, { recursive: true });

  const reviewRows = [
    [
      "folder_name",
      "detected_product_name",
      "image_count",
      "suggested_category",
      "suggested_collection",
      "needs_manual_review",
      "notes",
    ],
    ...products.map((product) => [
      product.folder_name,
      product.englishName,
      product.planned_images.length,
      product.category,
      product.collection,
      product.needs_manual_review,
      product.needs_manual_review
        ? "Filename is not meaningful; please rename folder and fill product metadata."
        : "Review detected grouping.",
    ]),
  ];

  const reviewCsv = reviewRows.map((row) => row.map(csvEscape).join(",")).join("\n");
  try {
    await writeFile(path.join(outputDir, "review-products.csv"), reviewCsv, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EBUSY") {
      throw error;
    }
    await writeFile(path.join(outputDir, "review-products-generated.csv"), reviewCsv, "utf8");
  }
  await writeFile(
    path.join(outputDir, "manual-review.json"),
    JSON.stringify(
      products.filter((product) => product.needs_manual_review),
      null,
      2,
    ),
    "utf8",
  );
  await writeFile(path.join(outputDir, "products-import.json"), JSON.stringify(products, null, 2), "utf8");
}

async function materializeProducts(products: PlannedProduct[]) {
  for (const product of products) {
    const folder = path.join(outputDir, product.folder_name);
    await mkdir(path.join(folder, "web"), { recursive: true });
    await mkdir(path.join(folder, "thumbs"), { recursive: true });

    for (const image of product.planned_images) {
      const copiedFile =
        image.copiedFile ||
        `${path.basename(image.webFile, path.extname(image.webFile))}${path.extname(image.originalPath).toLowerCase()}`;
      const copiedPath = path.join(folder, copiedFile);
      const webPath = path.join(folder, image.webFile);
      const thumbPath = path.join(folder, image.thumbnailFile);
      if (!existsSync(copiedPath)) {
        await copyFile(image.originalPath, copiedPath);
      }
      await optimizeImage(image.originalPath, webPath, 1600);
      await optimizeImage(image.originalPath, thumbPath, 600);
    }
  }
}

async function main() {
  if (!existsSync(sourceDir)) {
    throw new Error(`Source folder does not exist: ${sourceDir}`);
  }
  const files = await walkImages(sourceDir);
  const stats = await Promise.all(files.map((file) => stat(file)));
  const usingProposedGroups = existsSync(proposedGroupsPath);
  const products = usingProposedGroups
    ? (JSON.parse(await readFile(proposedGroupsPath, "utf8")) as PlannedProduct[])
    : makePlan(files);
  const hydratedProducts = hydrateProductImages(products);
  await writePlanFiles(hydratedProducts);

  if (!dryRun) {
    await materializeProducts(hydratedProducts);
  }

  const totalBytes = stats.reduce((sum, item) => sum + item.size, 0);
  console.log(JSON.stringify(
    {
      mode: dryRun ? "dry-run" : "write",
      sourceDir,
      outputDir,
      imageCount: files.length,
      productGroupCount: hydratedProducts.length,
      usingProposedGroups,
      totalBytes,
      wroteReviewCsv: path.join(outputDir, "review-products.csv"),
      wroteProductsImport: path.join(outputDir, "products-import.json"),
      wroteManualReview: path.join(outputDir, "manual-review.json"),
      copiedAndOptimizedImages: !dryRun,
      note: dryRun
        ? "Dry-run only: no product folders or optimized images were created."
        : "Write mode: product folders, original copies, WebP images, and thumbnails were created.",
    },
    null,
    2,
  ));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
