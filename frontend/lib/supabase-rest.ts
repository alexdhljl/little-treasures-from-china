import type { Product, ProductInput } from "@/lib/products";
import type { CmsCategory, CmsCollection, CmsMedia, CmsMuseum, CmsStory, SiteSetting } from "@/lib/cms";

type SupabaseSession = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: {
    id: string;
    email?: string;
  };
};

type DbProduct = {
  id: string;
  sku?: string | null;
  slug: string;
  name: string;
  english_name: string;
  museum: string | null;
  museum_id?: string | null;
  region: string | null;
  province: string | null;
  city: string | null;
  category: string | null;
  category_id?: string | null;
  collection: string | null;
  collection_id?: string | null;
  price: number | null;
  currency: string;
  short_description: string | null;
  story: string | null;
  materials: string | null;
  dimensions: string | null;
  weight: string | null;
  images: string[] | null;
  tags: string[] | null;
  occasion_tags: string[] | null;
  recipient_tags: string[] | null;
  gift_recommendations: string[] | null;
  official_collection: string | null;
  inventory_status: Product["inventoryStatus"];
  status?: Product["status"] | null;
  featured: boolean;
  related_product_ids: string[] | null;
  shipping_note: string | null;
  return_note: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  alt_text?: string | null;
  product_name_en?: string | null;
  product_name_zh?: string | null;
  brand?: string | null;
  supplier?: string | null;
  series?: string | null;
  subcategory?: string | null;
  target_audience?: string[] | null;
  short_description_en?: string | null;
  short_description_zh?: string | null;
  long_description_en?: string | null;
  long_description_zh?: string | null;
  story_en?: string | null;
  story_zh?: string | null;
  features?: string[] | null;
  whats_included?: string[] | null;
  colors?: string[] | null;
  package_size?: string | null;
  package_weight?: string | null;
  estimated_retail_price_min?: number | null;
  estimated_retail_price_max?: number | null;
  wholesale_price?: number | null;
  moq?: number | null;
  lead_time?: string | null;
  inventory_quantity?: number | null;
  origin?: string | null;
  cover_image?: string | null;
  gallery_images?: string[] | null;
  packaging_images?: string[] | null;
  lifestyle_images?: string[] | null;
  image_alt_en?: string | null;
  image_alt_zh?: string | null;
  seo_title_en?: string | null;
  seo_title_zh?: string | null;
  seo_description_en?: string | null;
  seo_description_zh?: string | null;
  seo_keywords?: string[] | null;
  needs_review?: boolean | null;
  ai_generated?: boolean | null;
  translation_checked?: boolean | null;
  photo_checked?: boolean | null;
  source_folder?: string | null;
  original_file_names?: string[] | null;
  countries_available?: string[] | null;
  languages?: string[] | null;
  ltps_version?: string | null;
  created_at: string;
  updated_at: string;
};

const SESSION_KEY = "ltfc-admin-session";
const STORAGE_BUCKET = "product-images";

export function getSupabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  };
}

export function isSupabaseConfigured() {
  const config = getSupabaseConfig();
  return Boolean(config.url && config.anonKey);
}

function requireConfig() {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return config;
}

function authHeaders(accessToken?: string) {
  const { anonKey } = requireConfig();
  return {
    apikey: anonKey,
    Authorization: `Bearer ${accessToken || anonKey}`,
  };
}

function dbToProduct(row: DbProduct): Product {
  const gallery = row.gallery_images?.length ? row.gallery_images : row.images || [];
  const cover = row.cover_image || gallery[0] || row.images?.[0] || "";
  const images = Array.from(new Set([cover, ...gallery, ...(row.packaging_images || []), ...(row.lifestyle_images || [])].filter(Boolean)));
  return {
    id: row.id,
    sku: row.sku || "",
    slug: row.slug,
    name: row.product_name_zh || row.name,
    englishName: row.product_name_en || row.english_name,
    brand: row.brand || "",
    supplier: row.supplier || "",
    museum: row.museum || "",
    museumId: row.museum_id || "",
    region: row.region || "",
    province: row.province || "",
    city: row.city || "",
    category: row.category || "",
    categoryId: row.category_id || "",
    subcategory: row.subcategory || "",
    collection: row.collection || "",
    collectionId: row.collection_id || "",
    series: row.series || "",
    price: row.price,
    estimatedPriceMin: row.estimated_retail_price_min ?? row.price,
    estimatedPriceMax: row.estimated_retail_price_max ?? row.price,
    wholesalePrice: row.wholesale_price ?? null,
    currency: row.currency,
    shortDescription: row.short_description_en || row.short_description || "",
    shortDescriptionZh: row.short_description_zh || "",
    longDescription: row.long_description_en || "",
    longDescriptionZh: row.long_description_zh || "",
    story: row.story_en || row.story || "",
    storyZh: row.story_zh || "",
    features: row.features || [],
    whatsIncluded: row.whats_included || [],
    materials: row.materials || "",
    colors: row.colors || [],
    dimensions: row.dimensions || "",
    weight: row.weight || "",
    packageSize: row.package_size || "",
    packageWeight: row.package_weight || "",
    moq: row.moq ?? 1,
    leadTime: row.lead_time || "",
    inventoryQuantity: row.inventory_quantity ?? null,
    origin: row.origin || "China",
    images,
    coverImage: cover,
    galleryImages: gallery,
    packagingImages: row.packaging_images || [],
    lifestyleImages: row.lifestyle_images || [],
    tags: row.tags || [],
    occasionTags: row.occasion_tags || [],
    recipientTags: row.recipient_tags || [],
    targetAudience: row.target_audience || [],
    giftRecommendations: row.gift_recommendations || [],
    officialCollection: row.official_collection || "",
    inventoryStatus: row.inventory_status,
    status: row.status || "published",
    featured: row.featured,
    relatedProductIds: row.related_product_ids || [],
    shippingNote: row.shipping_note || "",
    returnNote: row.return_note || "",
    seoTitle: row.seo_title_en || row.seo_title || "",
    seoTitleZh: row.seo_title_zh || "",
    seoDescription: row.seo_description_en || row.seo_description || "",
    seoDescriptionZh: row.seo_description_zh || "",
    seoKeywords: row.seo_keywords || [],
    altText: row.image_alt_en || row.alt_text || "",
    altTextZh: row.image_alt_zh || "",
    needsReview: row.needs_review ?? false,
    aiGenerated: row.ai_generated ?? false,
    translationChecked: row.translation_checked ?? false,
    photoChecked: row.photo_checked ?? false,
    sourceFolder: row.source_folder || "",
    originalFileNames: row.original_file_names || [],
    countriesAvailable: row.countries_available || ["US"],
    languages: row.languages || ["en", "zh"],
    ltpsVersion: row.ltps_version || "1.0",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function productToDb(input: ProductInput) {
  const cover = input.coverImage || input.images[0] || "";
  const gallery = input.galleryImages.length ? input.galleryImages : input.images;
  return {
    sku: input.sku || null,
    slug: input.slug,
    name: input.name,
    english_name: input.englishName,
    product_name_en: input.englishName,
    product_name_zh: input.name,
    brand: input.brand || null,
    supplier: input.supplier || null,
    museum: input.museum || null,
    museum_id: input.museumId || null,
    region: input.region || null,
    province: input.province || null,
    city: input.city || null,
    category: input.category || null,
    category_id: input.categoryId || null,
    subcategory: input.subcategory || null,
    collection: input.collection || null,
    collection_id: input.collectionId || null,
    series: input.series || null,
    price: input.price,
    estimated_retail_price_min: input.estimatedPriceMin,
    estimated_retail_price_max: input.estimatedPriceMax,
    wholesale_price: input.wholesalePrice,
    currency: input.currency || "USD",
    short_description: input.shortDescription || null,
    story: input.story || null,
    short_description_en: input.shortDescription || null,
    short_description_zh: input.shortDescriptionZh || null,
    long_description_en: input.longDescription || null,
    long_description_zh: input.longDescriptionZh || null,
    story_en: input.story || null,
    story_zh: input.storyZh || null,
    features: input.features || [],
    whats_included: input.whatsIncluded || [],
    materials: input.materials || null,
    colors: input.colors || [],
    dimensions: input.dimensions || null,
    weight: input.weight || null,
    package_size: input.packageSize || null,
    package_weight: input.packageWeight || null,
    moq: input.moq || 1,
    lead_time: input.leadTime || null,
    inventory_quantity: input.inventoryQuantity,
    origin: input.origin || "China",
    images: input.images || [],
    cover_image: cover || null,
    gallery_images: gallery || [],
    packaging_images: input.packagingImages || [],
    lifestyle_images: input.lifestyleImages || [],
    tags: input.tags || [],
    occasion_tags: input.occasionTags || [],
    recipient_tags: input.recipientTags || [],
    target_audience: input.targetAudience || [],
    gift_recommendations: input.giftRecommendations || [],
    official_collection: input.officialCollection || null,
    inventory_status: input.inventoryStatus,
    status: input.status,
    featured: input.featured,
    related_product_ids: input.relatedProductIds || [],
    shipping_note: input.shippingNote || null,
    return_note: input.returnNote || null,
    seo_title: input.seoTitle || null,
    seo_description: input.seoDescription || null,
    alt_text: input.altText || null,
    seo_title_en: input.seoTitle || null,
    seo_title_zh: input.seoTitleZh || null,
    seo_description_en: input.seoDescription || null,
    seo_description_zh: input.seoDescriptionZh || null,
    seo_keywords: input.seoKeywords || [],
    image_alt_en: input.altText || null,
    image_alt_zh: input.altTextZh || null,
    needs_review: input.needsReview,
    ai_generated: input.aiGenerated,
    translation_checked: input.translationChecked,
    photo_checked: input.photoChecked,
    source_folder: input.sourceFolder || null,
    original_file_names: input.originalFileNames || [],
    countries_available: input.countriesAvailable || ["US"],
    languages: input.languages || ["en", "zh"],
    ltps_version: "1.0",
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Supabase request failed with ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function fetchProducts(accessToken?: string) {
  const { url } = requireConfig();
  const response = await fetch(
    `${url}/rest/v1/products?select=*&order=featured.desc,created_at.desc`,
    {
      headers: authHeaders(accessToken),
      cache: "no-store",
    },
  );
  const rows = await parseResponse<DbProduct[]>(response);
  return rows.map(dbToProduct);
}

type CmsTable = "categories" | "museums" | "collections" | "stories" | "media" | "site_settings";

function snakeToCamelRow(row: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()), value]),
  );
}

function camelToSnakeRow(row: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(row)
      .filter(([key]) => !["id", "createdAt", "updatedAt"].includes(key))
      .map(([key, value]) => [key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`), value === "" ? null : value]),
  );
}

async function fetchCmsTable<T>(table: CmsTable, accessToken?: string, query = "") {
  const { url } = requireConfig();
  const suffix = query ? `&${query}` : "";
  const response = await fetch(`${url}/rest/v1/${table}?select=*${suffix}`, {
    headers: authHeaders(accessToken),
    cache: "no-store",
  });
  const rows = await parseResponse<Array<Record<string, unknown>>>(response);
  return rows.map((row) => snakeToCamelRow(row) as T);
}

export async function fetchCategories(accessToken?: string) {
  return fetchCmsTable<CmsCategory>("categories", accessToken, "order=sort_order.asc,name.asc");
}

export async function fetchMuseums(accessToken?: string) {
  return fetchCmsTable<CmsMuseum>("museums", accessToken, "order=sort_order.asc,name.asc");
}

export async function fetchCollections(accessToken?: string) {
  return fetchCmsTable<CmsCollection>("collections", accessToken, "order=sort_order.asc,name.asc");
}

export async function fetchStories(accessToken?: string) {
  return fetchCmsTable<CmsStory>("stories", accessToken, "order=featured.desc,created_at.desc");
}

export async function fetchMedia(accessToken?: string) {
  return fetchCmsTable<CmsMedia>("media", accessToken, "order=created_at.desc");
}

export async function fetchSiteSettings(accessToken?: string) {
  return fetchCmsTable<SiteSetting>("site_settings", accessToken, "order=key.asc");
}

export async function fetchPublicCms() {
  try {
    const [categories, museums, collections, stories, settings] = await Promise.all([
      fetchCategories(),
      fetchMuseums(),
      fetchCollections(),
      fetchStories(),
      fetchSiteSettings(),
    ]);
    return { categories, museums, collections, stories, settings };
  } catch (error) {
    console.error("Unable to load public CMS content", error);
    return { categories: [], museums: [], collections: [], stories: [], settings: [] };
  }
}

export async function saveCmsRecord<T extends Record<string, unknown>>(
  table: CmsTable,
  value: T,
  accessToken: string,
) {
  const { url } = requireConfig();
  const id = typeof value.id === "string" ? value.id : "";
  const endpoint = id ? `${url}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}` : `${url}/rest/v1/${table}`;
  const response = await fetch(endpoint, {
    method: id ? "PATCH" : "POST",
    headers: {
      ...authHeaders(accessToken),
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(camelToSnakeRow(value)),
  });
  const rows = await parseResponse<Array<Record<string, unknown>>>(response);
  return snakeToCamelRow(rows[0]) as T;
}

export async function saveSiteSetting(key: string, value: Record<string, unknown>, accessToken: string) {
  const { url } = requireConfig();
  const response = await fetch(`${url}/rest/v1/site_settings?on_conflict=key`, {
    method: "POST",
    headers: {
      ...authHeaders(accessToken),
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify({ key, value }),
  });
  return parseResponse<Array<Record<string, unknown>>>(response);
}

export async function deleteCmsRecord(table: CmsTable, id: string, accessToken: string) {
  const { url } = requireConfig();
  const response = await fetch(`${url}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
  });
  if (!response.ok) throw new Error((await response.text()) || "Delete failed.");
}

export async function fetchPublicProducts() {
  try {
    return (await fetchProducts()).filter((product) => product.status === "active" || product.status === "published");
  } catch (error) {
    console.error("Unable to load public products", error);
    return [];
  }
}

export async function fetchProductBySlug(slug: string) {
  const { url } = requireConfig();
  const response = await fetch(
    `${url}/rest/v1/products?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`,
    {
      headers: authHeaders(),
      cache: "no-store",
    },
  );
  const rows = await parseResponse<DbProduct[]>(response);
  return rows[0] ? dbToProduct(rows[0]) : null;
}

export async function fetchPublicProductBySlug(slug: string) {
  try {
    return await fetchProductBySlug(slug);
  } catch (error) {
    console.error("Unable to load public product", error);
    return null;
  }
}

export async function fetchRelatedProducts(ids: string[]) {
  if (!ids.length) {
    return [];
  }
  const { url } = requireConfig();
  const response = await fetch(
    `${url}/rest/v1/products?id=in.(${ids.map(encodeURIComponent).join(",")})&select=*`,
    {
      headers: authHeaders(),
      cache: "no-store",
    },
  );
  const rows = await parseResponse<DbProduct[]>(response);
  return rows.map(dbToProduct);
}

export async function fetchPublicRelatedProducts(ids: string[]) {
  try {
    return await fetchRelatedProducts(ids);
  } catch (error) {
    console.error("Unable to load related products", error);
    return [];
  }
}

export async function signInAdmin(email: string, password: string) {
  const { url, anonKey } = requireConfig();
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const session = await parseResponse<SupabaseSession>(response);

  const adminResponse = await fetch(
    `${url}/rest/v1/admin_users?user_id=eq.${session.user.id}&select=user_id&limit=1`,
    {
      headers: authHeaders(session.access_token),
    },
  );
  const admins = await parseResponse<Array<{ user_id: string }>>(adminResponse);
  if (!admins.length) {
    throw new Error("This user is not registered as a Little Treasures admin.");
  }

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getStoredSession(): SupabaseSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as SupabaseSession;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function clearStoredSession() {
  window.localStorage.removeItem(SESSION_KEY);
}

export async function createProduct(input: ProductInput, accessToken: string) {
  const { url } = requireConfig();
  const response = await fetch(`${url}/rest/v1/products`, {
    method: "POST",
    headers: {
      ...authHeaders(accessToken),
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(productToDb(input)),
  });
  const rows = await parseResponse<DbProduct[]>(response);
  return dbToProduct(rows[0]);
}

export async function updateProduct(id: string, input: ProductInput, accessToken: string) {
  const { url } = requireConfig();
  const response = await fetch(`${url}/rest/v1/products?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      ...authHeaders(accessToken),
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(productToDb(input)),
  });
  const rows = await parseResponse<DbProduct[]>(response);
  return dbToProduct(rows[0]);
}

export async function deleteProduct(id: string, accessToken: string) {
  const { url } = requireConfig();
  const response = await fetch(`${url}/rest/v1/products?id=eq.${id}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Delete failed with ${response.status}`);
  }
}

export async function uploadProductImage(file: File, accessToken: string) {
  const { url } = requireConfig();
  const extension = file.name.split(".").pop() || "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  const response = await fetch(`${url}/storage/v1/object/${STORAGE_BUCKET}/${path}`, {
    method: "POST",
    headers: {
      ...authHeaders(accessToken),
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "false",
    },
    body: file,
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Upload failed with ${response.status}`);
  }
  return `${url}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}

export async function registerMedia(
  value: Omit<CmsMedia, "id" | "createdAt">,
  accessToken: string,
) {
  return saveCmsRecord("media", value as unknown as Record<string, unknown>, accessToken);
}
