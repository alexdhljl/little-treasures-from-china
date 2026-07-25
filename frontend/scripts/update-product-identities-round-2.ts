import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type Correction = {
  slug: string;
  nameZh?: string;
  nameEn?: string;
  museum?: string;
};

const capitalMuseum = "Capital Museum Culture Development Co., Ltd.";
const corrections: Correction[] = [
  { slug: "double-tailed-tiger-mini-stapler", museum: "Jiangxi Provincial Museum" },
  { slug: "panda-expressions-eraser-set", nameZh: "萌趣熊猫文创橡皮", nameEn: "Playful Panda Cultural Erasers" },
  { slug: "maya-sun-god-fridge-magnet", museum: capitalMuseum },
  { slug: "mayan-jewelry-i", museum: capitalMuseum },
  { slug: "mayan-jewelry-ii", museum: capitalMuseum },
  { slug: "mayan-jewelry-iii", museum: capitalMuseum },
  { slug: "maya-civilization-mystery-box", nameZh: "玛雅首饰四", nameEn: "Maya Jewelry IV", museum: capitalMuseum },
  { slug: "leopard-plush-pendant", museum: capitalMuseum },
  { slug: "leopard-and-sun-god-pendant", museum: capitalMuseum },
  { slug: "spider-hollow-out-magnet", museum: capitalMuseum },
  { slug: "incense-burner-stand-magnet", nameZh: "玛雅图腾冰箱贴", nameEn: "Maya Totem Fridge Magnet", museum: capitalMuseum },
  { slug: "deer-pattern-gold-earrings-magnet", nameZh: "玛雅鹿纹冰箱贴", nameEn: "Maya Deer-Pattern Fridge Magnet", museum: capitalMuseum },
  { slug: "wukong-fridge-magnet", nameZh: "悟空来了冰箱贴", nameEn: "Here Comes Wukong Fridge Magnet" },
  { slug: "andean-condor-magnetic-notebook", museum: capitalMuseum },
  { slug: "weekly-journal-notebook", nameZh: "玛雅周日历", nameEn: "Maya Weekly Calendar", museum: capitalMuseum },
  { slug: "bamboo-signature-pen", museum: "Liaoning Provincial Library" },
  { slug: "capital-museum-series-pen", museum: capitalMuseum },
  // The later, product-specific instruction for this pen takes precedence.
  { slug: "plum-blossom-signature-pen", museum: "Zhejiang Museum of Natural History" },
  { slug: "jade-faced-figure-wobbling-pen", nameZh: "玛雅人物面具摇摇笔", nameEn: "Maya Figure Mask Wobbling Pen", museum: capitalMuseum },
  { slug: "panda-wobbling-pen", museum: capitalMuseum },
  { slug: "jade-faced-figure-eraser", nameZh: "玛雅人物面具橡皮", nameEn: "Maya Figure Mask Eraser", museum: capitalMuseum },
  { slug: "carved-glazed-flower-eraser-set", nameZh: "西洋花琉璃构件文创橡皮", nameEn: "Western Floral Glazed Architectural Component Cultural Eraser" },
  { slug: "analong-dinosaur-eraser-set", nameZh: "阿纳川街龙橡皮套装", nameEn: "Anachuanjie Dragon Eraser Set" },
  { slug: "jiangbei-chongqing-dragon-eraser-set", museum: "Chongqing Natural History Museum" },
  { slug: "sleeping-deer-mini-stapler", nameZh: "小鹿迷你订书器", museum: "Jiangxi Provincial Museum" },
  { slug: "maya-double-sided-deity-keychain", nameZh: "玛雅双面神祇钥匙扣", museum: capitalMuseum },
  { slug: "maya-sun-deity-graphic-t-shirt", nameZh: "玛雅太阳神图案 T 恤", museum: capitalMuseum },
  { slug: "maya-world-tree-weekly-planner", nameZh: "玛雅周日历", nameEn: "Maya Weekly Calendar", museum: capitalMuseum },
  { slug: "andean-condor-cultural-notebook", nameZh: "安第斯神鹰文化笔记本", museum: capitalMuseum },
  { slug: "chavin-totem-fridge-magnet", nameZh: "玛雅图腾冰箱贴", nameEn: "Maya Totem Fridge Magnet", museum: capitalMuseum },
  { slug: "maya-sun-deity-bottle-opener-magnet", nameZh: "玛雅太阳神开瓶器冰箱贴", museum: capitalMuseum },
];

const dryRun = !process.argv.includes("--write");
const frontendRoot = process.cwd();
const projectRoot = path.resolve(frontendRoot, "..");
for (const line of (await readFile(path.join(frontendRoot, ".env.local"), "utf8")).split(/\r?\n/)) {
  const match = line.trim().match(/^([^#=\s]+)=(.*)$/);
  if (match) process.env[match[1]] ||= match[2].replace(/^['"]|['"]$/g, "");
}

const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
const slugs = corrections.map(({ slug }) => slug);
const response = await fetch(`${base}/rest/v1/products?slug=in.(${slugs.join(",")})&select=*`, { headers });
if (!response.ok) throw new Error(await response.text());
const before = await response.json() as Array<Record<string, unknown>>;
if (before.length !== corrections.length) {
  const found = new Set(before.map((row) => row.slug));
  throw new Error(`Expected ${corrections.length} products, found ${before.length}. Missing: ${slugs.filter((slug) => !found.has(slug)).join(", ")}`);
}

const planned = corrections.map((correction) => {
  const current = before.find((row) => row.slug === correction.slug)!;
  return {
    slug: correction.slug,
    before: { name: current.name, english_name: current.english_name, museum: current.museum },
    after: {
      name: correction.nameZh ?? current.name,
      english_name: correction.nameEn ?? current.english_name,
      museum: correction.museum ?? current.museum,
    },
  };
});
if (dryRun) {
  console.log(JSON.stringify({ mode: "dry-run", count: planned.length, planned }, null, 2));
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(projectRoot, "backup", "corrected-product-identities-round-2", stamp);
await mkdir(backupDir, { recursive: true });
await writeFile(path.join(backupDir, "products-before.json"), JSON.stringify(before, null, 2), "utf8");
await writeFile(path.join(backupDir, "planned-updates.json"), JSON.stringify(planned, null, 2), "utf8");

for (const correction of corrections) {
  const current = before.find((row) => row.slug === correction.slug)!;
  const nameZh = correction.nameZh ?? String(current.name);
  const nameEn = correction.nameEn ?? String(current.english_name);
  const payload = {
    name: nameZh,
    english_name: nameEn,
    product_name_zh: nameZh,
    product_name_en: nameEn,
    seo_title: nameEn,
    seo_title_zh: nameZh,
    seo_title_en: nameEn,
    alt_text: nameEn,
    image_alt_zh: nameZh,
    image_alt_en: nameEn,
    museum: correction.museum ?? current.museum,
    translation_checked: true,
    updated_at: new Date().toISOString(),
  };
  const update = await fetch(`${base}/rest/v1/products?slug=eq.${encodeURIComponent(correction.slug)}`, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify(payload),
  });
  if (!update.ok) throw new Error(`${correction.slug}: ${await update.text()}`);
  console.log(`updated ${correction.slug}`);
}
console.log(JSON.stringify({ mode: "write", count: corrections.length, backupDir }, null, 2));
