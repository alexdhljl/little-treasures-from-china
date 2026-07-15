import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";
import { fetchPublicProducts, isSupabaseConfigured } from "@/lib/supabase-rest";

export const dynamic = "force-dynamic";

const staticPaths = ["", "/catalog", "/collections", "/about", "/contact", "/inquiry", "/institutions"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const localizedStaticRoutes = staticPaths.flatMap((path) =>
    (["en", "zh"] as const).map((locale) => ({
      url: `${siteConfig.domain}/${locale}${path}`,
      lastModified: now,
      changeFrequency: path === "" ? ("daily" as const) : ("weekly" as const),
      priority: path === "" ? 1 : 0.7,
    })),
  );

  const products = isSupabaseConfigured() ? await fetchPublicProducts() : [];
  const productRoutes = products.flatMap((product) =>
    (["en", "zh"] as const).map((locale) => ({
      url: `${siteConfig.domain}/${locale}/products/${product.slug}`,
      lastModified: product.updatedAt ? new Date(product.updatedAt) : now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  );

  return [...localizedStaticRoutes, ...productRoutes];
}
