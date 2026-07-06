import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, ImageOff } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
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
    collection?: string;
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
  const activeFilter = query.gift || query.category || query.collection || "";
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
    <main className="min-h-screen bg-white text-[#171717]">
      <SiteHeader locale={locale} path="/catalog" />
      <section className="border-b border-black/10 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
          <p className="commerce-kicker">{t.catalog.kicker}</p>
          <h1 className="mt-2 max-w-5xl text-[30px] font-black leading-tight sm:text-[38px]">
            {activeFilterLabel || t.catalog.title}
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-6 text-[#555]">
            {t.catalog.intro}
          </p>
          {activeFilter ? (
            <a className="mt-4 inline-flex items-center gap-2 text-sm font-black" href={localizedPath(locale, "/catalog")}>
              {t.catalog.clear} <ArrowRight size={15} />
            </a>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        {!isSupabaseConfigured() ? (
          <div className="border border-black/10 bg-white p-5 sm:p-8">
            <h2 className="text-2xl font-black">{t.catalog.notConfigured}</h2>
          </div>
        ) : filteredProducts.length ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">
            {filteredProducts.map((product) => (
              <a
                className="group min-w-0 bg-white"
                href={localizedPath(locale, `/products/${product.slug}`)}
                key={product.id}
              >
                <div className="grid aspect-[4/5] place-items-center overflow-hidden bg-[#f1efe9]">
                  {product.images[0] ? (
                    <img
                      alt={productTitle(product, locale)}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
                      loading="lazy"
                      src={product.images[0]}
                    />
                  ) : (
                    <ImageOff className="text-[#888]" size={34} />
                  )}
                </div>
                <div className="pt-3">
                  <p className="truncate text-[11px] font-bold uppercase text-[#777]">
                    {displayName(product.museum || product.region, locale) || t.catalog.fallbackMuseum}
                  </p>
                  <h2 className="mt-1 line-clamp-2 text-[15px] font-bold leading-[1.35] sm:text-base">
                    {productTitle(product, locale)}
                  </h2>
                  <p className="mt-1.5 text-sm text-[#555]">{formatPriceForLocale(product, locale)}</p>
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
      <SiteFooter locale={locale} />
    </main>
  );
}
