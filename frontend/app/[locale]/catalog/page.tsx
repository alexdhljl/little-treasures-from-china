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
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-5 sm:py-16 lg:py-20">
          <p className="section-kicker">{t.catalog.kicker}</p>
          <h1 className="mt-4 max-w-5xl text-4xl font-black leading-[0.98] sm:text-6xl lg:text-7xl">
            {activeFilterLabel || t.catalog.title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#4a4a4a] sm:mt-7 sm:text-xl sm:leading-8">
            {t.catalog.intro}
          </p>
          {activeFilter ? (
            <a className="mt-7 inline-flex items-center gap-2 text-sm font-black" href={localizedPath(locale, "/catalog")}>
              {t.catalog.clear} <ArrowRight size={15} />
            </a>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-5 sm:py-16">
        {!isSupabaseConfigured() ? (
          <div className="border border-black/10 bg-white p-5 sm:p-8">
            <h2 className="text-2xl font-black">{t.catalog.notConfigured}</h2>
          </div>
        ) : filteredProducts.length ? (
          <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <a
                className="group border border-black/10 bg-white transition hover:-translate-y-1 hover:shadow-[0_18px_35px_rgba(0,0,0,0.08)]"
                href={localizedPath(locale, `/products/${product.slug}`)}
                key={product.id}
              >
                <div className="grid aspect-[4/3] max-h-[340px] place-items-center overflow-hidden bg-[#f6f2ea] sm:aspect-square sm:max-h-none">
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
                <div className="p-4 sm:p-5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2c6f6d]">
                    {displayName(product.museum || product.region, locale) || t.catalog.fallbackMuseum}
                  </p>
                  <h2 className="mt-2 text-xl font-black leading-tight sm:mt-3">
                    {productTitle(product, locale)}
                  </h2>
                  <p className="mt-2 line-clamp-2 text-[15px] leading-6 text-[#555] sm:mt-3 sm:line-clamp-3 sm:text-sm">
                    {product.shortDescription}
                  </p>
                  <div className="mt-4 flex items-center justify-between gap-4 sm:mt-5">
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
          <div className="border border-black/10 bg-white p-5 sm:p-8">
            <h2 className="text-2xl font-black">
              {products.length ? t.catalog.noMatch : t.catalog.noProducts}
            </h2>
          </div>
        )}
      </section>
    </main>
  );
}
