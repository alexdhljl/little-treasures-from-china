import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, ImageOff } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { fetchPublicProducts, isSupabaseConfigured } from "@/lib/supabase-rest";
import {
  dictionary,
  displayFilter,
  displayName,
  filterAliases,
  formatPriceForLocale,
  isLocale,
  localizedPath,
  productTitle,
  type Locale,
} from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Product Catalog | Little Treasures From China",
};

export const dynamic = "force-dynamic";

type CatalogPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    gift?: string;
    category?: string;
    sort?: string;
  }>;
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "");
}

function filterTerms(value: string) {
  return [value, ...(filterAliases[value] || [])].map(normalize);
}

export default async function LocalizedCatalogPage({ params, searchParams }: CatalogPageProps) {
  const { locale: localeParam } = await params;
  if (!isLocale(localeParam)) {
    notFound();
  }
  const locale: Locale = localeParam;
  const t = dictionary[locale];
  const query = await searchParams;
  const products = isSupabaseConfigured() ? await fetchPublicProducts() : [];
  const activeFilter = query.gift || query.category || "";
  const activeFilterLabel = displayFilter(activeFilter, locale);
  const activeTerms = activeFilter ? filterTerms(activeFilter) : [];
  const filteredProducts = activeFilter
    ? products.filter((product) => {
        const haystack = [
          product.category,
          product.collection,
          product.museum,
          product.name,
          product.englishName,
          ...product.tags,
          ...product.occasionTags,
          ...product.recipientTags,
          ...product.giftRecommendations,
        ]
          .map(normalize)
          .join(" ");
        return activeTerms.some((term) => haystack.includes(term));
      })
    : products;

  return (
    <main className="min-h-screen bg-[#fffdf8] text-[#171717]">
      <SiteHeader locale={locale} path="/catalog" />
      <section className="border-b border-black/10 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <p className="section-kicker">{t.catalog.kicker}</p>
          <h1 className="mt-4 max-w-5xl text-6xl font-black leading-[0.92] sm:text-7xl">
            {activeFilterLabel || t.catalog.title}
          </h1>
          <p className="mt-7 max-w-2xl text-xl leading-8 text-[#4a4a4a]">
            {t.catalog.intro}
          </p>
          {activeFilter ? (
            <a className="mt-7 inline-flex items-center gap-2 text-sm font-black" href={localizedPath(locale, "/catalog")}>
              {t.catalog.clear} <ArrowRight size={15} />
            </a>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16">
        {!isSupabaseConfigured() ? (
          <div className="border border-black/10 bg-white p-8">
            <h2 className="text-2xl font-black">{t.catalog.notConfigured}</h2>
          </div>
        ) : filteredProducts.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <a
                className="group border border-black/10 bg-white transition hover:-translate-y-1 hover:shadow-[0_18px_35px_rgba(0,0,0,0.08)]"
                href={localizedPath(locale, `/products/${product.slug}`)}
                key={product.id}
              >
                <div className="grid aspect-square place-items-center bg-[#f6f2ea]">
                  {product.images[0] ? (
                    <img
                      alt={productTitle(product, locale)}
                      className="h-full w-full object-cover"
                      src={product.images[0]}
                    />
                  ) : (
                    <ImageOff className="text-[#888]" size={34} />
                  )}
                </div>
                <div className="p-5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2c6f6d]">
                    {displayName(product.museum || product.region, locale) || t.catalog.fallbackMuseum}
                  </p>
                  <h2 className="mt-3 text-xl font-black leading-tight">
                    {productTitle(product, locale)}
                  </h2>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#555]">
                    {product.shortDescription}
                  </p>
                  <div className="mt-5 flex items-center justify-between gap-4">
                    <span className="font-black">{formatPriceForLocale(product, locale)}</span>
                    <span className="inline-flex items-center gap-1 text-sm font-black">
                      {t.catalog.view} <ArrowRight size={15} />
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="border border-black/10 bg-white p-8">
            <h2 className="text-2xl font-black">
              {products.length ? t.catalog.noMatch : t.catalog.noProducts}
            </h2>
          </div>
        )}
      </section>
    </main>
  );
}
