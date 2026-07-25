import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type Correction = {
  slug: string;
  nameZh: string;
  nameEn: string;
  museum?: string;
};

const corrections: Correction[] = [
  { slug: "baoji-bronze-miniature-gift", nameZh: "青铜跪跽俑", nameEn: "Bronze Kneeling Figurine", museum: "Anhui Museum" },
  { slug: "heritage-character-pencil-set", nameZh: "文化主题摇摇笔套装", nameEn: "Cultural Theme Wobbling Pen Set", museum: "Zhejiang Provincial Museum" },
  { slug: "heritage-motif-gift-box", nameZh: "内嵌珐琅嵌玉葫芦瓶书签", nameEn: "Inlaid Enamel and Jade Gourd-Vase Bookmark", museum: "Liaoning Provincial Museum" },
  { slug: "promotion-board-game-gift", nameZh: "吉人天相铜镜开瓶器", nameEn: "Auspicious Portrait Bronze-Mirror Bottle Opener", museum: "Jilin Provincial Museum" },
  { slug: "four-musicians-translucent-bookmark", nameZh: "四人乐舞铜俑透光书签", nameEn: "Four Musicians Bronze Figurines Translucent Bookmark", museum: "Yunnan Provincial Museum" },
  { slug: "jade-cong-fridge-magnet", nameZh: "玉琮王冰箱贴", nameEn: "Jade Cong King Fridge Magnet", museum: "Zhejiang Provincial Museum" },
  { slug: "tang-style-round-ornament", nameZh: "摩羯戏珠纹金花银盘冰箱贴", nameEn: "Makara-and-Pearl Gold-Flower Silver Plate Fridge Magnet", museum: "Inner Mongolia Museum" },
  { slug: "fu-hao-owl-zun-pendant", nameZh: "铜钺钥匙扣", nameEn: "Bronze Yue Keychain" },
  { slug: "figure-motif-long-gift", nameZh: "海豚签字笔", nameEn: "Dolphin Signature Pen" },
  { slug: "tiger-motif-long-gift-box", nameZh: "青铜伏鸟双尾虎文物橡皮", nameEn: "Bronze Crouching-Bird Double-Tailed Tiger Artifact Eraser", museum: "Jiangxi Provincial Museum" },
  { slug: "yinxu-cultural-life-gift", nameZh: "藏族护法神面具冰箱贴&开瓶器", nameEn: "Tibetan Guardian Deity Mask Fridge Magnet & Bottle Opener", museum: "Yunnan Provincial Museum" },
  { slug: "phoenix-pattern-glass-cup", nameZh: "滕王阁冰川杯", nameEn: "Tengwang Pavilion Glacier Cup" },
  { slug: "heritage-motif-pouch", nameZh: "海昏侯博物馆杜邦收纳袋", nameEn: "Haihunhou Museum DuPont Storage Pouch", museum: "Haihunhou Museum" },
  { slug: "chinese-mask-paper-art-set", nameZh: "藏族面具冰箱贴&开瓶器", nameEn: "Tibetan Mask Fridge Magnet & Bottle Opener", museum: "Yunnan Provincial Museum" },
  { slug: "fu-hao-owl-zun-coin-bank", nameZh: "史伐卣透光书签", nameEn: "Shi Fa You Translucent Bookmark", museum: "Liaoning Provincial Museum" },
  { slug: "sanxingdui-figure-3d-eraser", nameZh: "三彩釉陶载乐骆驼3D立体橡皮", nameEn: "Tri-Color Glazed Musician-Bearing Camel 3D Eraser", museum: "National Museum of China" },
  { slug: "turquoise-animal-3d-eraser", nameZh: "绿釉鸱吻3D立体橡皮", nameEn: "Green-Glazed Chiwen 3D Eraser" },
  { slug: "fu-hao-owl-zun-gift-box", nameZh: "伏鸟双尾青铜虎金属徽章", nameEn: "Crouching-Bird Double-Tailed Bronze Tiger Metal Badge", museum: "Jiangxi Provincial Museum" },
  { slug: "oracle-bone-script-discovery-gift", nameZh: "乌丸归义侯金印印章橡皮", nameEn: "Wuwan Guiyi Marquis Gold Seal Stamp Eraser" },
  { slug: "fu-hao-owl-zun-stamp-gift", nameZh: "鹿首金步摇饰", nameEn: "Deer-Head Gold Buyao Ornament", museum: "Inner Mongolia Museum" },
  { slug: "drumming-storyteller-3d-eraser", nameZh: "击鼓说唱俑3D立体橡皮", nameEn: "Drumming Storyteller Figurine 3D Eraser", museum: "National Museum of China" },
  { slug: "gold-crown-ornament", nameZh: "金镶红蓝宝石冠冰箱贴", nameEn: "Gold Crown with Ruby and Sapphire Fridge Magnet", museum: "Yunnan Provincial Museum" },
  { slug: "fu-hao-owl-zun-fridge-magnet", nameZh: "伯矩鬲文创冰箱贴&开瓶器", nameEn: "Boju Li Cultural Fridge Magnet & Bottle Opener", museum: "Beijing Capital Museum Culture Development Co., Ltd." },
  { slug: "heritage-plush-keychains", nameZh: "羊肚菌&牛肝菌毛绒钥匙扣", nameEn: "Morel & Bolete Plush Keychains", museum: "Yunnan Provincial Museum" },
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

const preview = corrections.map((correction) => {
  const current = before.find((row) => row.slug === correction.slug)!;
  return {
    slug: correction.slug,
    before: { name: current.name, english_name: current.english_name, museum: current.museum },
    after: { name: correction.nameZh, english_name: correction.nameEn, museum: correction.museum ?? current.museum },
  };
});
if (dryRun) {
  console.log(JSON.stringify({ mode: "dry-run", count: preview.length, preview }, null, 2));
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(projectRoot, "backup", "corrected-product-identities", stamp);
await mkdir(backupDir, { recursive: true });
await writeFile(path.join(backupDir, "products-before.json"), JSON.stringify(before, null, 2), "utf8");
await writeFile(path.join(backupDir, "planned-updates.json"), JSON.stringify(preview, null, 2), "utf8");

for (const correction of corrections) {
  const current = before.find((row) => row.slug === correction.slug)!;
  const payload = {
    name: correction.nameZh,
    english_name: correction.nameEn,
    product_name_zh: correction.nameZh,
    product_name_en: correction.nameEn,
    seo_title: correction.nameEn,
    seo_title_zh: correction.nameZh,
    seo_title_en: correction.nameEn,
    alt_text: correction.nameEn,
    image_alt_zh: correction.nameZh,
    image_alt_en: correction.nameEn,
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
