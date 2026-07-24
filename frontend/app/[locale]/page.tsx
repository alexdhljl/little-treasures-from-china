import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, ImageOff } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { fetchPublicCms, fetchPublicProducts, isSupabaseConfigured } from "@/lib/supabase-rest";
import { displayFilter, formatPriceForLocale, isLocale, localizedPath, productTitle, type Locale } from "@/lib/i18n";
import { siteConfig } from "@/lib/site";
import type { Product } from "@/lib/products";

export const dynamic = "force-dynamic";
const restoredHomepageHeroImage =
  "https://pgbjgueicmpakgaaisdg.supabase.co/storage/v1/object/public/product-images/double-tailed-tiger-mini-stapler/cover.webp";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = isLocale(localeParam) ? localeParam : "en";
  const url = `${siteConfig.domain}/${locale}`;
  const title = locale === "zh" ? "Auctus Heritage | 来自中国博物馆的有心礼物" : "Auctus Heritage | Museum Gifts from China";
  const description =
    locale === "zh"
      ? "发现适合日常生活、用心赠礼与文化分享的中国博物馆灵感好物。"
      : "Discover museum-inspired cultural gifts from China for everyday life, thoughtful gifting, and cultural discovery.";

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        en: `${siteConfig.domain}/en`,
        zh: `${siteConfig.domain}/zh`,
      },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: siteConfig.name,
      type: "website",
    },
  };
}

export default async function LocalizedHome({ params }: PageProps) {
  const { locale: localeParam } = await params;
  if (!isLocale(localeParam)) notFound();
  const locale: Locale = localeParam;
  const products = isSupabaseConfigured() ? await fetchPublicProducts() : [];
  const cms = isSupabaseConfigured() ? await fetchPublicCms() : { categories: [], museums: [], collections: [], stories: [], settings: [] };
  const bestSellers = (products.filter((item) => item.featured).length ? products.filter((item) => item.featured) : products).slice(0, 8);
  const newArrivals = [...products].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 8);
  const collections = cms.collections.filter((item) => item.featured).slice(0, 6);
  const occasions = cms.categories.filter((item) => item.kind === "occasion" && item.featured).slice(0, 10);
  const about = cms.stories.find((item) => item.kind === "about" && item.published);
  const settings = (cms.settings.find((item) => item.key === "homepage")?.value || {}) as Record<string, string>;
  const heroImage = settings.heroImage || restoredHomepageHeroImage;
  const heroTitle = locale === "zh" ? settings.heroTitleZh : settings.heroTitle;
  const heroDescription = locale === "zh" ? settings.heroDescriptionZh : settings.heroDescription;

  return (
    <main className="min-h-screen bg-white text-[#171717]">
      <SiteHeader locale={locale} path="/" />
      <section className="border-b border-black/10 bg-[#f6f4ef]">
        <div className="mx-auto grid max-w-7xl md:h-[460px] md:grid-cols-[0.84fr_1.16fr]">
          <div className="flex flex-col justify-center px-4 py-5 sm:px-6 sm:py-9 lg:px-10">
            <p className="commerce-kicker">{locale === "zh" ? "中国博物馆文创精选" : "Curated Museum Gifts"}</p>
            <h1 className="mt-2.5 max-w-xl text-[32px] font-black leading-[1.05] sm:text-[44px] lg:text-[52px]">
              {heroTitle || (locale === "zh" ? "来自中国博物馆的礼物" : "Museum Gifts from China")}
            </h1>
            <p className="mt-3 max-w-lg text-[15px] leading-6 text-[#555] sm:text-base">
              {heroDescription || (locale === "zh" ? "为日常生活、用心赠礼与文化分享精选的博物馆灵感好物。" : "Thoughtful objects for everyday life, meaningful gifting, and cultural discovery.")}
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <a className="commerce-button bg-[#171717] text-white" href={localizedPath(locale, "/catalog")}>{locale === "zh" ? "浏览产品" : "Shop Products"}<ArrowRight size={16} /></a>
              <a className="commerce-button border border-black/20 bg-white" href={localizedPath(locale, "/collections")}>{locale === "zh" ? "博物馆系列" : "Museum Collections"}</a>
            </div>
          </div>
          <div className="h-[180px] overflow-hidden bg-[#ebe8e0] sm:h-[260px] md:h-auto">
            {heroImage ? <img alt={locale === "zh" ? "中国博物馆文创礼品" : "Museum gifts from China"} className="h-full w-full object-contain" fetchPriority="high" src={heroImage} /> : null}
          </div>
        </div>
      </section>

      <ProductSection label={locale === "zh" ? "畅销产品" : "Best Sellers"} locale={locale} products={bestSellers} />
      <ProductSection alternate label={locale === "zh" ? "新品上架" : "New Arrivals"} locale={locale} products={newArrivals} />

      <section className="commerce-section">
        <SectionHeader href={localizedPath(locale, "/collections")} label={locale === "zh" ? "博物馆系列" : "Museum Collections"} locale={locale} />
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
          {collections.map((collection) => (
            <a className="group" href={`${localizedPath(locale, "/catalog")}?collection=${encodeURIComponent(collection.name)}`} key={collection.id}>
              <div className="aspect-[4/3] overflow-hidden bg-white">{collection.bannerImage ? <img alt="" className="h-full w-full object-contain transition duration-500 group-hover:scale-[1.02]" loading="lazy" src={collection.bannerImage} /> : null}</div>
              <h3 className="mt-3 text-[16px] font-bold leading-tight sm:text-lg">{locale === "zh" ? collection.nameZh || displayFilter(collection.name, locale) : collection.name}</h3>
            </a>
          ))}
        </div>
      </section>

      <section className="commerce-section border-t border-black/10 bg-[#f7f5f0]">
        <SectionHeader href={localizedPath(locale, "/catalog")} label={locale === "zh" ? "按送礼场景选购" : "Shop by Occasion"} locale={locale} />
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {occasions.map((occasion) => {
            const name = locale === "zh" ? occasion.nameZh || displayFilter(occasion.name, locale) : occasion.name;
            return <a className="group border border-black/10 bg-white" href={`${localizedPath(locale, "/catalog")}?gift=${encodeURIComponent(name)}`} key={occasion.id}><div className="aspect-[4/3] overflow-hidden bg-white">{occasion.image ? <img alt="" className="h-full w-full object-contain transition duration-500 group-hover:scale-[1.03]" loading="lazy" src={occasion.image} /> : null}</div><p className="px-3 py-3 text-sm font-bold">{name}</p></a>;
          })}
        </div>
      </section>

      <section className="border-t border-black/10 bg-white py-10 sm:py-14">
        <div className="mx-auto grid max-w-7xl items-center gap-7 px-4 sm:px-6 md:grid-cols-[1.05fr_0.95fr]">
          <div className="aspect-[5/3] max-h-[360px] overflow-hidden bg-white">{about?.coverImage || heroImage ? <img alt="" className="h-full w-full object-contain" loading="lazy" src={about?.coverImage || heroImage} /> : null}</div>
          <div className="max-w-xl"><p className="commerce-kicker">{locale === "zh" ? "关于 Auctus Heritage" : "About Auctus Heritage"}</p><h2 className="mt-3 text-[28px] font-black leading-tight sm:text-[34px]">{locale === "zh" ? about?.titleZh || "把文化故事带进日常生活" : about?.title || "Cultural stories for everyday life"}</h2><p className="mt-4 line-clamp-4 text-[15px] leading-7 text-[#555]">{locale === "zh" ? about?.excerptZh : about?.excerpt}</p><a className="mt-5 inline-flex items-center gap-2 text-sm font-bold" href={localizedPath(locale, "/about")}>{locale === "zh" ? "了解更多" : "Learn More"}<ArrowRight size={15} /></a></div>
        </div>
      </section>

      <SiteFooter locale={locale} />
    </main>
  );
}

function SectionHeader({ label, href, locale }: { label: string; href: string; locale: Locale }) {
  return <div className="flex items-end justify-between gap-4"><h2 className="text-[26px] font-black leading-none sm:text-[30px]">{label}</h2><a className="inline-flex items-center gap-1.5 text-sm font-bold" href={href}>{locale === "zh" ? "查看全部" : "View All"}<ArrowRight size={15} /></a></div>;
}

function ProductSection({ label, products, locale, alternate = false }: { label: string; products: Product[]; locale: Locale; alternate?: boolean }) {
  if (!products.length) return null;
  return <section className={`commerce-section border-b border-black/10 ${alternate ? "bg-[#f7f5f0]" : "bg-white"}`}><SectionHeader href={localizedPath(locale, "/catalog")} label={label} locale={locale} /><div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:gap-x-5 lg:grid-cols-4 xl:grid-cols-4">{products.map((product) => <a className="group min-w-0" href={localizedPath(locale, `/products/${product.slug}`)} key={product.id}><div className="grid aspect-[4/5] place-items-center overflow-hidden bg-white">{product.images[0] ? <img alt={product.altText || productTitle(product, locale)} className="h-full w-full object-contain p-2 transition duration-500 group-hover:scale-[1.025]" loading="lazy" src={product.images[0]} /> : <ImageOff className="text-[#999]" size={28} />}</div><div className="pt-3"><p className="truncate text-[11px] font-bold uppercase text-[#777]">{product.museum || product.category}</p><h3 className="mt-1 line-clamp-2 text-[15px] font-bold leading-[1.35] sm:text-base">{productTitle(product, locale)}</h3><p className="mt-1.5 text-sm text-[#555]">{formatPriceForLocale(product, locale)}</p></div></a>)}</div></section>;
}
