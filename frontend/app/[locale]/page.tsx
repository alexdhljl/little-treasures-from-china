import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, ImageOff, Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { SiteHeader } from "@/components/SiteHeader";
import { collections, heroImageUrl } from "@/lib/site-data";
import { fetchPublicProducts, isSupabaseConfigured } from "@/lib/supabase-rest";
import {
  dictionary,
  displayName,
  formatPriceForLocale,
  isLocale,
  journalTopicsByLocale,
  localizedOccasions,
  localizedPath,
  localizedStories,
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
  const bestSellers = liveProducts.filter((product) => product.featured).slice(0, 4);

  return (
    <main className="min-h-screen bg-[#fffdf8] text-[#171717]">
      <SiteHeader locale={locale} path="/" />

      <section className="relative overflow-hidden border-b border-black/10">
        <div className="absolute inset-y-0 right-0 hidden w-[62%] md:block">
          <img
            alt={locale === "zh" ? "中国博物馆文创礼品陈列" : "Curated Chinese museum gift objects"}
            className="h-full w-full object-cover"
            src={heroImageUrl}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#fffdf8] via-[#fffdf8]/92 to-[#fffdf8]/18" />
        <div className="relative mx-auto grid min-h-[470px] max-w-7xl items-center px-4 py-12 sm:min-h-[560px] sm:px-5 sm:py-16 lg:min-h-[690px] md:grid-cols-[0.92fr_1.08fr]">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-bold">
              <Sparkles size={16} className="text-[#f27a5e]" />
              {t.home.tagline}
            </div>
            <h1 className="sr-only">{t.brand}</h1>
            <BrandLogo className="w-full max-w-[360px] sm:max-w-[520px] lg:max-w-[650px]" priority />
            <p className="mt-5 max-w-xl text-base leading-7 text-[#3b3b3b] sm:mt-7 sm:text-xl sm:leading-8">
              {t.home.subheadline}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row">
              <a
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#171717] px-6 py-4 text-base font-extrabold text-white transition hover:bg-[#2c6f6d]"
                href={localizedPath(locale, "/catalog")}
              >
                {t.home.findGift} <ArrowRight size={18} />
              </a>
              <a
                className="inline-flex items-center justify-center gap-2 rounded-full border border-black/20 bg-white px-6 py-4 text-base font-extrabold transition hover:border-[#2c6f6d] hover:text-[#2c6f6d]"
                href={localizedPath(locale, "/collections")}
              >
                {t.home.exploreCollections} <BookOpen size={18} />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-5">
          <p className="section-kicker">{t.home.occasionKicker}</p>
          <h2 className="section-title">{t.home.occasionTitle}</h2>
          <div className="mt-8 grid gap-4 sm:mt-10 md:grid-cols-2 lg:grid-cols-3">
            {localizedOccasions[locale].map(([name, note], index) => (
              <a
                className={`min-h-44 bg-gradient-to-br ${["from-[#f9d95f] to-[#fff2b1]", "from-[#65c6c4] to-[#dcfbf7]", "from-[#f27a5e] to-[#ffe0d8]", "from-[#ffb4cc] to-[#fff0f6]", "from-[#b8a572] to-[#f7efd6]", "from-[#88a8f6] to-[#edf2ff]"][index]} p-4 transition hover:-translate-y-1 hover:shadow-[0_18px_35px_rgba(0,0,0,0.08)] sm:min-h-64 sm:p-6`}
                href={`${localizedPath(locale, "/catalog")}?gift=${encodeURIComponent(name)}`}
                key={name}
              >
                <h3 className="text-2xl font-black sm:text-3xl">{name}</h3>
                <p className="mt-10 text-[15px] font-bold leading-6 text-[#373737] sm:mt-20 sm:text-base sm:leading-7">{note}</p>
              </a>
            ))}
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

      <section className="bg-white py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-5">
          <p className="section-kicker">{t.home.storiesKicker}</p>
          <h2 className="section-title">{t.home.storiesTitle}</h2>
          <div className="mt-8 grid gap-4 sm:mt-10 md:grid-cols-2 lg:grid-cols-4">
            {localizedStories[locale].map(([title, description]) => (
              <article className="border border-black/10 bg-[#fffdf8] p-5" key={title}>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f27a5e]">Story</p>
                <h3 className="mt-6 text-xl font-black leading-tight sm:mt-8 sm:text-2xl">{title}</h3>
                <p className="mt-4 text-sm leading-6 text-[#555]">{description}</p>
                <a className="mt-6 inline-flex items-center gap-2 text-sm font-black" href={localizedPath(locale, "/catalog")}>
                  {t.home.relatedGifts} <ArrowRight size={15} />
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-black/10 bg-[#fffdf8] py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-5">
          <p className="section-kicker">{t.home.museumKicker}</p>
          <h2 className="section-title">{t.home.museumTitle}</h2>
          <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3">
            {collections.slice(0, 9).map((collection) => (
              <a className="overflow-hidden border border-black/10 bg-white transition hover:-translate-y-1 hover:shadow-[0_18px_35px_rgba(0,0,0,0.08)]" href={localizedPath(locale, "/collections")} key={collection.name}>
                <div className={`h-24 ${collection.color}`} />
                <div className="p-5">
                  <h3 className="text-2xl font-black">{displayName(collection.name, locale)}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#555]">{collection.theme}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-5">
          <p className="section-kicker">{t.home.journalKicker}</p>
          <h2 className="section-title">{t.home.journalTitle}</h2>
          <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 lg:grid-cols-5">
            {journalTopicsByLocale[locale].map((topic) => (
              <article className="border-t-4 border-[#171717] bg-[#fffdf8] p-5" key={topic}>
                <h3 className="text-xl font-black">{topic}</h3>
                <p className="mt-12 text-sm font-bold text-[#555]">{t.home.comingSoon}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
