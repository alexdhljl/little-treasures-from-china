import type { Product, ProductInput } from "@/lib/products";

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
  slug: string;
  name: string;
  english_name: string;
  museum: string | null;
  region: string | null;
  province: string | null;
  city: string | null;
  category: string | null;
  collection: string | null;
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
  featured: boolean;
  related_product_ids: string[] | null;
  shipping_note: string | null;
  return_note: string | null;
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
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    englishName: row.english_name,
    museum: row.museum || "",
    region: row.region || "",
    province: row.province || "",
    city: row.city || "",
    category: row.category || "",
    collection: row.collection || "",
    price: row.price,
    currency: row.currency,
    shortDescription: row.short_description || "",
    story: row.story || "",
    materials: row.materials || "",
    dimensions: row.dimensions || "",
    weight: row.weight || "",
    images: row.images || [],
    tags: row.tags || [],
    occasionTags: row.occasion_tags || [],
    recipientTags: row.recipient_tags || [],
    giftRecommendations: row.gift_recommendations || [],
    officialCollection: row.official_collection || "",
    inventoryStatus: row.inventory_status,
    featured: row.featured,
    relatedProductIds: row.related_product_ids || [],
    shippingNote: row.shipping_note || "",
    returnNote: row.return_note || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function productToDb(input: ProductInput) {
  return {
    slug: input.slug,
    name: input.name,
    english_name: input.englishName,
    museum: input.museum || null,
    region: input.region || null,
    province: input.province || null,
    city: input.city || null,
    category: input.category || null,
    collection: input.collection || null,
    price: input.price,
    currency: input.currency || "USD",
    short_description: input.shortDescription || null,
    story: input.story || null,
    materials: input.materials || null,
    dimensions: input.dimensions || null,
    weight: input.weight || null,
    images: input.images || [],
    tags: input.tags || [],
    occasion_tags: input.occasionTags || [],
    recipient_tags: input.recipientTags || [],
    gift_recommendations: input.giftRecommendations || [],
    official_collection: input.officialCollection || null,
    inventory_status: input.inventoryStatus,
    featured: input.featured,
    related_product_ids: input.relatedProductIds || [],
    shipping_note: input.shippingNote || null,
    return_note: input.returnNote || null,
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

export async function fetchPublicProducts() {
  try {
    return await fetchProducts();
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
