import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, ImageOff, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { fetchPublicCms, fetchPublicProducts, isSupabaseConfigured } from "@/lib/supabase-rest";
import {
  dictionary,
  formatPriceForLocale,
  isLocale,
  localizedPath,
  productTitle,
  type Locale,
} from "@/lib/i18n";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function LocalizedHome({ params }: PageProps) {
  const { locale: localeParam } = await params;
  if (!isLocale(localeParam)) {
    notFound();
  }
  const locale: Locale = localeParam;
  const t = dictionary[locale];
  const liveProducts = isSupabaseConfigured() ? await fetchPublicProducts() : [];
  const cms = isSupabaseConfigured() ? await fetchPublicCms() : { categories: [], museums: [], collections: [], stories: [], settings: [] };
  const bestSellers = liveProducts.filter((product) => product.featured).slice(0, 4);
  const newArrivals = [...liveProducts].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 4);
  const occasions = cms.categories.filter((item) => item.kind === "occasion" && item.featured).slice(0, 6);
  const museumCollections = cms.collections.filter((item) => item.featured).slice(0, 8);
  const aboutStory = cms.stories.find((item) => item.kind === "about" && item.published);
  const homepage = (cms.settings.find((item) => item.key === "homepage")?.value || {}) as Record<string, string>;
  const heroTitle = locale === "zh" ? homepage.heroTitleZh : homepage.heroTitle;
  const heroDescription = locale === "zh" ? homepage.heroDescriptionZh : homepage.heroDescription;
  const heroImage = homepage.heroImage || liveProducts.find((item) => item.images[0])?.images[0] || "";

  return (
    <main className="min-h-screen bg-[#fffdf8] text-[#171717]">
      <SiteHeader locale={locale} path="/" />

      <section className="border-b border-black/10 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-5 sm:py-14 md:grid-cols-[0.9fr_1.1fr] md:items-center lg:gap-14 lg:py-16">
          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-bold">
              <Sparkles size={16} className="text-[#f27a5e]" />
              {t.home.tagline}
            </div>
            <h1 className="text-4xl font-black leading-[0.98] sm:text-5xl lg:text-6xl">
              {heroTitle || (locale === "zh" ? "来自中国博物馆的有心礼物" : "Thoughtful Gifts Inspired by China's Museums")}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#3b3b3b] sm:text-lg sm:leading-8">
              {heroDescription || t.home.subheadline}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row">
              <a
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#171717] px-6 py-4 text-base font-extrabold text-white transition hover:bg-[#2c6f6d]"
                href={localizedPath(locale, "/catalog")}
              >
                {locale === "zh" ? "浏览礼品" : "Browse Gifts"} <ArrowRight size={18} />
              </a>
              <a
                className="inline-flex items-center justify-center gap-2 rounded-full border border-black/20 bg-white px-6 py-4 text-base font-extrabold transition hover:border-[#2c6f6d] hover:text-[#2c6f6d]"
                href={localizedPath(locale, "/collections")}
              >
                {locale === "zh" ? "礼品顾问" : "Gift Finder"} <BookOpen size={18} />
              </a>
            </div>
          </div>
          <div className="aspect-[4/3] max-h-[560px] overflow-hidden bg-[#f1efe9]">
            {heroImage ? <img alt={locale === "zh" ? "精选中国博物馆文创礼品" : "Curated museum gifts from China"} className="h-full w-full object-cover" fetchPriority="high" src={heroImage} /> : null}
          </div>
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-5">
          <p className="section-kicker">{t.home.occasionKicker}</p>
          <h2 className="section-title">{t.home.occasionTitle}</h2>
          <div className="mt-8 grid gap-4 sm:mt-10 md:grid-cols-2 lg:grid-cols-3">
            {occasions.map((occasion, index) => {
              const name = locale === "zh" ? occasion.nameZh || occasion.name : occasion.name;
              return (
              <a
                className={`relative min-h-44 overflow-hidden bg-[#f1efe9] p-4 transition hover:-translate-y-1 hover:shadow-[0_18px_35px_rgba(0,0,0,0.08)] sm:min-h-56 sm:p-6`}
                href={`${localizedPath(locale, "/catalog")}?gift=${encodeURIComponent(name)}`}
                key={occasion.id}
              >
                {occasion.image ? <img alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" loading="lazy" src={occasion.image} /> : null}
                <div className="relative flex h-full flex-col justify-between"><span className="text-xs font-black uppercase tracking-[0.16em] text-[#555]">0{index + 1}</span><div><h3 className="text-2xl font-black sm:text-3xl">{name}</h3><p className="mt-3 text-sm leading-6 text-[#444]">{occasion.description}</p></div></div>
              </a>
            )})}
          </div>
        </div>
      </section>

      <section className="border-y border-black/10 bg-[#f6f2ea] py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-5">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="section-kicker">{t.home.bestKicker}</p>
              <h2 className="section-title">{t.home.bestTitle}</h2>
            </div>
            <a className="inline-flex items-center gap-2 text-sm font-black" href={localizedPath(locale, "/catalog")}>
              {t.home.viewAll} <ArrowRight size={16} />
            </a>
          </div>
          <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 lg:grid-cols-4">
            {(bestSellers.length ? bestSellers : liveProducts.slice(0, 4)).map((product) => (
              <a className="bg-white" href={localizedPath(locale, `/products/${product.slug}`)} key={product.id}>
                <div className="grid aspect-[4/3] max-h-[320px] place-items-center overflow-hidden bg-[#fffdf8] sm:aspect-square sm:max-h-none">
                  {product.images[0] ? (
                    <img alt={productTitle(product, locale)} className="h-full w-full object-cover" src={product.images[0]} />
                  ) : (
                    <ImageOff className="text-[#888]" size={34} />
                  )}
                </div>
                <div className="p-4 text-center sm:p-5">
                  <h3 className="text-lg font-black leading-tight sm:text-base">{productTitle(product, locale)}</h3>
                  <p className="mt-2 text-sm text-[#555]">{formatPriceForLocale(product, locale)}</p>
                </div>
              </a>
            ))}
            {!liveProducts.length
              ? ["Teacher gift edit", "Housewarming shelf object", "Dunhuang notebook", "Bronze charm"].map((item, index) => (
                  <div className="bg-white p-5" key={item}>
                    <div className={["aspect-[4/3]", "bg-[#f9d95f]", "bg-[#65c6c4]", "bg-[#f27a5e]", "bg-[#88a8f6]"][index]} />
                    <h3 className="mt-4 text-center font-black">{locale === "zh" ? ["教师礼物精选", "乔迁家居小物", "敦煌笔记本", "青铜灵感挂饰"][index] : item}</h3>
                    <p className="mt-2 text-center text-sm text-[#555]">{t.home.addInAdmin}</p>
                  </div>
                ))
              : null}
          </div>
        </div>
      </section>

      <ProductBand kicker={locale === "zh" ? "新品" : "New Arrivals"} locale={locale} products={newArrivals} title={locale === "zh" ? "刚刚抵达的小小珍宝。" : "Newly arrived, thoughtfully selected."} />

      <section className="border-y border-black/10 bg-[#fffdf8] py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-5">
          <p className="section-kicker">{t.home.museumKicker}</p>
          <h2 className="section-title">{t.home.museumTitle}</h2>
          <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3">
            {museumCollections.map((collection) => (
              <a className="overflow-hidden border border-black/10 bg-white transition hover:-translate-y-1 hover:shadow-[0_18px_35px_rgba(0,0,0,0.08)]" href={`${localizedPath(locale, "/catalog")}?collection=${encodeURIComponent(collection.name)}`} key={collection.id}>
                <div className="h-36 bg-[#ece9e1]">{collection.bannerImage ? <img alt="" className="h-full w-full object-cover" loading="lazy" src={collection.bannerImage} /> : null}</div>
                <div className="p-5">
                  <h3 className="text-2xl font-black">{locale === "zh" ? collection.nameZh || collection.name : collection.name}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#555]">{collection.description}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16"><div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-center"><div className="aspect-[4/3] overflow-hidden bg-[#ece9e1]">{aboutStory?.coverImage ? <img alt="" className="h-full w-full object-cover" loading="lazy" src={aboutStory.coverImage} /> : heroImage ? <img alt="" className="h-full w-full object-cover" loading="lazy" src={heroImage} /> : null}</div><div><p className="section-kicker">{locale === "zh" ? "关于我们" : "About Little Treasures"}</p><h2 className="mt-4 text-3xl font-black leading-tight sm:text-5xl">{locale === "zh" ? aboutStory?.titleZh || "让文化好物进入日常生活。" : aboutStory?.title || "Museum stories, thoughtfully brought into everyday life."}</h2><p className="mt-5 max-w-xl text-base leading-7 text-[#555]">{locale === "zh" ? aboutStory?.excerptZh : aboutStory?.excerpt}</p><a className="mt-6 inline-flex items-center gap-2 text-sm font-black" href={localizedPath(locale, "/about")}>{locale === "zh" ? "了解我们的故事" : "Read our story"}<ArrowRight size={16} /></a></div></div></section>

      <footer className="border-t border-black/10 bg-[#171717] py-10 text-white"><div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-5 md:flex-row md:items-end md:justify-between"><div><p className="text-xl font-black">Little Treasures From China</p><p className="mt-2 text-sm text-white/60">Thoughtful Gifts. Beautiful Stories.</p></div><div className="flex flex-wrap gap-5 text-sm font-bold"><a href={localizedPath(locale, "/catalog")}>{locale === "zh" ? "礼品" : "Gifts"}</a><a href={localizedPath(locale, "/collections")}>{locale === "zh" ? "系列" : "Collections"}</a><a href={localizedPath(locale, "/about")}>{locale === "zh" ? "关于" : "About"}</a><a href={localizedPath(locale, "/contact")}>{locale === "zh" ? "联系" : "Contact"}</a></div></div></footer>
    </main>
  );
}

function ProductBand({ kicker, title, products, locale }: { kicker: string; title: string; products: Awaited<ReturnType<typeof fetchPublicProducts>>; locale: Locale }) {
  if (!products.length) return null;
  return <section className="border-y border-black/10 bg-white py-12 sm:py-16"><div className="mx-auto max-w-7xl px-4 sm:px-5"><p className="section-kicker">{kicker}</p><h2 className="section-title">{title}</h2><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{products.map((product) => <a className="border border-black/10 bg-[#fffdf8]" href={localizedPath(locale, `/products/${product.slug}`)} key={product.id}><div className="aspect-[4/3] overflow-hidden bg-[#f1efe9]">{product.images[0] ? <img alt={product.altText || productTitle(product, locale)} className="h-full w-full object-cover" loading="lazy" src={product.images[0]} /> : <div className="grid h-full place-items-center"><ImageOff /></div>}</div><div className="p-4"><p className="text-xs font-black uppercase tracking-[0.14em] text-[#2c6f6d]">{product.museum || product.category}</p><h3 className="mt-2 text-lg font-black leading-tight">{productTitle(product, locale)}</h3><p className="mt-3 text-sm font-bold">{formatPriceForLocale(product, locale)}</p></div></a>)}</div></div></section>;
}
