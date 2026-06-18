import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ImageOff, Mail, PackageCheck } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import {
  fetchPublicProductBySlug,
  fetchPublicRelatedProducts,
  isSupabaseConfigured,
} from "@/lib/supabase-rest";
import {
  dictionary,
  displayFilter,
  displayName,
  formatPriceForLocale,
  inventoryLabel,
  isLocale,
  localizedPath,
  productSubtitle,
  productTitle,
  type Locale,
} from "@/lib/i18n";

type ProductPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale) || !isSupabaseConfigured()) {
    return { title: "Product | Little Treasures From China" };
  }
  const product = await fetchPublicProductBySlug(slug);
  return {
    title: product
      ? `${productTitle(product, locale)} | Little Treasures From China`
      : "Product Not Found | Little Treasures From China",
    description: product?.shortDescription,
  };
}

export default async function LocalizedProductPage({ params }: ProductPageProps) {
  const { locale: localeParam, slug } = await params;
  if (!isLocale(localeParam)) {
    notFound();
  }
  const locale: Locale = localeParam;
  const t = dictionary[locale];
  const product = isSupabaseConfigured() ? await fetchPublicProductBySlug(slug) : null;
  const relatedProducts = product ? await fetchPublicRelatedProducts(product.relatedProductIds) : [];

  return (
    <main className="min-h-screen bg-[#fffdf8] text-[#171717]">
      <SiteHeader locale={locale} path={`/products/${slug}`} />
      {!product ? (
        <section className="mx-auto max-w-4xl px-5 py-24">
          <h1 className="text-5xl font-black">{t.product.notFound}</h1>
          <p className="mt-5 text-lg text-[#555]">{t.product.notFoundNote}</p>
          <a
            className="mt-8 inline-flex rounded-full bg-[#171717] px-6 py-3 font-black text-white"
            href={localizedPath(locale, "/catalog")}
          >
            {t.product.backCatalog}
          </a>
        </section>
      ) : (
        <>
          <section className="mx-auto grid max-w-7xl gap-10 px-5 py-12 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="grid gap-4">
              <div className="grid min-h-[560px] place-items-center bg-[#f6f2ea]">
                {product.images[0] ? (
                  <img
                    alt={productTitle(product, locale)}
                    className="h-full max-h-[720px] w-full object-cover"
                    src={product.images[0]}
                  />
                ) : (
                  <ImageOff className="text-[#888]" size={42} />
                )}
              </div>
              {product.images.length > 1 ? (
                <div className="grid grid-cols-4 gap-3">
                  {product.images.slice(1, 5).map((image) => (
                    <img alt="" className="aspect-square w-full bg-white object-cover" key={image} src={image} />
                  ))}
                </div>
              ) : null}
            </div>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              <p className="section-kicker">{displayFilter(product.category, locale) || t.product.gift}</p>
              <h1 className="mt-4 text-4xl font-black leading-tight">
                {productTitle(product, locale)}
              </h1>
              {productSubtitle(product, locale) ? (
                <p className="mt-2 text-xl font-bold text-[#555]">{productSubtitle(product, locale)}</p>
              ) : null}
              <p className="mt-5 text-lg leading-8 text-[#555]">{product.shortDescription}</p>

              <div className="mt-7 border-y border-black/10 py-5">
                <dl className="grid gap-4 text-sm">
                  {[
                    [t.product.price, formatPriceForLocale(product, locale)],
                    [t.product.inventory, inventoryLabel(product.inventoryStatus, locale)],
                    [t.product.museumSource, displayName(product.museum, locale) || t.product.curated],
                    [
                      t.product.location,
                      [product.city, product.province, displayName(product.region, locale)].filter(Boolean).join(", ") ||
                        t.product.confirm,
                    ],
                  ].map(([label, value]) => (
                    <div className="grid grid-cols-[140px_1fr] gap-4" key={label}>
                      <dt className="text-[#555]">{label}</dt>
                      <dd className="font-bold capitalize">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="mt-6 grid gap-2">
                <a
                  className="inline-flex items-center justify-center gap-2 bg-[#2f4650] px-6 py-4 text-base font-black text-white transition hover:bg-[#171717]"
                  href={`mailto:hello@auctuslab.com?subject=${encodeURIComponent(`${t.product.requestPrice} - ${productTitle(product, locale)}`)}`}
                >
                  {t.product.requestPrice} <Mail size={18} />
                </a>
                <a
                  className="inline-flex items-center justify-center gap-2 border border-black/15 bg-white px-6 py-4 text-base font-black transition hover:border-[#2c6f6d] hover:text-[#2c6f6d]"
                  href={`mailto:hello@auctuslab.com?subject=${encodeURIComponent(`${t.product.ask} - ${productTitle(product, locale)}`)}`}
                >
                  {t.product.ask}
                </a>
                <a
                  className="inline-flex items-center justify-center gap-2 border border-black/15 bg-white px-6 py-4 text-base font-black transition hover:border-[#2c6f6d] hover:text-[#2c6f6d]"
                  href={localizedPath(locale, "/contact")}
                >
                  {t.requestCatalog}
                </a>
              </div>
            </aside>
          </section>

          <section className="mx-auto max-w-7xl px-5 py-12">
            <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
              <article className="border border-black/10 bg-white p-6">
                <h2 className="text-3xl font-black">{t.product.storyTitle}</h2>
                <p className="mt-5 whitespace-pre-line text-lg leading-8 text-[#444]">
                  {product.story || t.product.storyPending}
                </p>
              </article>
              <div className="grid gap-3">
                <div className="border border-black/10 bg-white p-5">
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-[#2c6f6d]">
                    {t.product.museumSource}
                  </p>
                  <h3 className="mt-3 text-2xl font-black">{displayName(product.museum, locale) || t.product.curated}</h3>
                  <dl className="mt-5 grid gap-3 text-sm">
                    {[
                      [locale === "zh" ? "省份" : "Province", displayName(product.province, locale) || product.province || t.product.confirm],
                      [locale === "zh" ? "城市" : "City", product.city || t.product.confirm],
                      [t.product.officialCollection, product.officialCollection || product.collection || t.product.confirm],
                    ].map(([label, value]) => (
                      <div className="flex justify-between gap-5 border-t border-black/10 pt-3" key={label}>
                        <dt className="text-[#666]">{label}</dt>
                        <dd className="font-bold">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div className="border border-black/10 bg-white p-5">
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-[#f27a5e]">
                    {t.product.perfectFor}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(product.giftRecommendations.length ? product.giftRecommendations : [...t.product.perfectDefaults]).map((item) => (
                      <span className="rounded-full border border-black/10 bg-[#fffdf8] px-3 py-2 text-sm font-bold" key={item}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                {[
                  [t.product.materials, product.materials],
                  [t.product.dimensions, product.dimensions],
                  [t.product.weight, product.weight],
                  [t.product.shipping, product.shippingNote],
                  [t.product.returns, product.returnNote],
                ].map(([label, value]) => (
                  <div className="flex gap-3 border border-black/10 bg-white p-5" key={label}>
                    <PackageCheck className="shrink-0 text-[#2c6f6d]" size={22} />
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.16em] text-[#777]">{label}</p>
                      <p className="mt-2 font-bold">{value || t.product.confirm}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {relatedProducts.length ? (
            <section className="mx-auto max-w-7xl px-5 py-12">
              <h2 className="text-2xl font-black">{t.product.related}</h2>
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {relatedProducts.map((related) => (
                  <a className="bg-white" href={localizedPath(locale, `/products/${related.slug}`)} key={related.id}>
                    <div className="grid aspect-square place-items-center bg-[#f6f2ea]">
                      {related.images[0] ? (
                        <img alt={productTitle(related, locale)} className="h-full w-full object-cover" src={related.images[0]} />
                      ) : (
                        <ImageOff className="text-[#888]" size={30} />
                      )}
                    </div>
                    <h3 className="mt-4 text-center font-bold leading-tight">{productTitle(related, locale)}</h3>
                    <p className="mt-2 text-center text-sm">{formatPriceForLocale(related, locale)}</p>
                  </a>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}
