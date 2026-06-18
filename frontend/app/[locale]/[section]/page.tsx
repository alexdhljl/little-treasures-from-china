import { notFound } from "next/navigation";
import { ArrowRight, Building2, Landmark, Mail, MapPin, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { collections, heroImageUrl, museums, regions } from "@/lib/site-data";
import { dictionary, displayName, isLocale, localizedPath, type Locale } from "@/lib/i18n";

const sections = ["about", "collections", "contact", "institutions", "museums", "regions"] as const;
type Section = (typeof sections)[number];

type PageProps = {
  params: Promise<{ locale: string; section: string }>;
};

function isSection(value: string): value is Section {
  return sections.includes(value as Section);
}

export default async function LocalizedSectionPage({ params }: PageProps) {
  const { locale: localeParam, section: sectionParam } = await params;
  if (!isLocale(localeParam) || !isSection(sectionParam)) {
    notFound();
  }
  const locale: Locale = localeParam;
  const t = dictionary[locale].staticPages[sectionParam];

  return (
    <main className="min-h-screen bg-[#fffdf8] text-[#171717]">
      <SiteHeader locale={locale} path={`/${sectionParam}`} />
      <section className={`border-b border-black/10 ${sectionParam === "institutions" ? "bg-[#171717] text-white" : "bg-white"}`}>
        <div className="mx-auto max-w-7xl px-5 py-20">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-black/15 bg-[#fffdf8] px-4 py-2 text-sm font-bold text-[#171717]">
            <Sparkles size={16} className="text-[#f27a5e]" />
            {t.kicker}
          </div>
          <h1 className="max-w-5xl text-6xl font-black leading-[0.92] sm:text-7xl">
            {t.title}
          </h1>
          <p className={`mt-7 max-w-2xl text-xl leading-8 ${sectionParam === "institutions" ? "text-white/75" : "text-[#4a4a4a]"}`}>
            {t.intro}
          </p>
        </div>
      </section>

      {sectionParam === "about" ? <AboutBody locale={locale} /> : null}
      {sectionParam === "collections" ? <CollectionsBody locale={locale} /> : null}
      {sectionParam === "contact" ? <ContactBody locale={locale} /> : null}
      {sectionParam === "institutions" ? <InstitutionsBody locale={locale} /> : null}
      {sectionParam === "museums" ? <MuseumsBody locale={locale} /> : null}
      {sectionParam === "regions" ? <RegionsBody locale={locale} /> : null}
    </main>
  );
}

function AboutBody({ locale }: { locale: Locale }) {
  const page = dictionary[locale].staticPages.about;
  return (
    <section className="mx-auto grid max-w-6xl gap-12 px-5 py-20 lg:grid-cols-[280px_1fr]">
      <aside>
        <p className="section-kicker">{locale === "zh" ? "我们的故事" : "Our Story"}</p>
        <div className="mt-6 h-3 w-28 bg-[#f9d95f]" />
        <div className="mt-3 h-3 w-20 bg-[#65c6c4]" />
        <div className="mt-3 h-3 w-14 bg-[#f27a5e]" />
      </aside>
      <article className="max-w-3xl">
        {page.body.map((paragraph, index) => (
          <p
            className={index === 2 || index === 3 ? "mt-10 text-3xl font-black leading-tight" : "mt-6 text-xl leading-9 text-[#3f3f3f]"}
            key={paragraph}
          >
            {paragraph}
          </p>
        ))}
      </article>
    </section>
  );
}

function CollectionsBody({ locale }: { locale: Locale }) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-16">
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {collections.map((collection) => (
          <a
            className="overflow-hidden border border-black/10 bg-white transition hover:-translate-y-1 hover:shadow-[0_18px_35px_rgba(0,0,0,0.08)]"
            href={`${localizedPath(locale, "/catalog")}?category=${encodeURIComponent(collection.name)}`}
            key={collection.name}
          >
            <div className={`h-32 ${collection.color}`} />
            <div className="p-5">
              <h2 className="text-2xl font-black">{displayName(collection.name, locale)}</h2>
              <p className="mt-3 min-h-20 text-sm leading-6 text-[#555]">{collection.theme}</p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-black">
                {locale === "zh" ? "查看产品" : "View products"} <ArrowRight size={15} />
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

function ContactBody({ locale }: { locale: Locale }) {
  const t = dictionary[locale].staticPages.contact;
  return (
    <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[1.08fr_0.92fr]">
      <div className="relative min-h-[520px] overflow-hidden bg-[#f1eee7]">
        <img
          alt={locale === "zh" ? "精选中国文化礼品目录" : "Curated Chinese museum gifts catalog"}
          className="h-full min-h-[520px] w-full object-cover"
          src={heroImageUrl}
        />
      </div>
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="section-kicker">{t.kicker}</p>
        <h2 className="mt-4 text-4xl font-black leading-tight">{t.title}</h2>
        <p className="mt-5 text-lg leading-8 text-[#555]">{t.intro}</p>
        <div className="mt-8 border-y border-black/10 py-6">
          <dl className="grid gap-4 text-sm">
            <div className="grid grid-cols-[150px_1fr] gap-4">
              <dt className="text-[#555]">{locale === "zh" ? "价格" : "Estimated Price"}</dt>
              <dd className="font-black">$12 - $45 per item</dd>
            </div>
            <div className="grid grid-cols-[150px_1fr] gap-4">
              <dt className="text-[#555]">{locale === "zh" ? "配送" : "Shipping"}</dt>
              <dd>{locale === "zh" ? "国际配送单独报价" : "International shipping quoted separately"}</dd>
            </div>
          </dl>
        </div>
        <a
          className="mt-8 inline-flex items-center justify-center gap-2 bg-[#2f4650] px-6 py-4 text-base font-black text-white transition hover:bg-[#171717]"
          href="mailto:hello@auctuslab.com?subject=Little%20Treasures%20From%20China%20Order%20Inquiry"
        >
          {t.button} <Mail size={18} />
        </a>
      </aside>
    </section>
  );
}

function InstitutionsBody({ locale }: { locale: Locale }) {
  const services =
    locale === "zh"
      ? ["博物馆文创精选组合", "课堂与教育项目礼品", "节日文化礼盒", "地区和博物馆主题目录", "面向海外用户的产品故事", "先咨询、后确认的订购流程"]
      : ["Curated museum gift assortments", "Educational object edits", "Seasonal cultural gift bundles", "Regional and museum-themed catalog requests", "North America-facing product storytelling", "Conversation before checkout"];
  return (
    <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[0.9fr_1.1fr]">
      <div>
        <Building2 className="text-[#2c6f6d]" size={34} />
        <h2 className="mt-5 text-4xl font-black leading-tight">
          {locale === "zh" ? "先以精选咨询模式服务机构采购。" : "Built for inquiry-based commerce first."}
        </h2>
        <a
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#171717] px-6 py-4 text-base font-extrabold text-white transition hover:bg-[#2c6f6d]"
          href={localizedPath(locale, "/contact")}
        >
          {locale === "zh" ? "索取机构目录" : "Request an institutional catalog"} <Mail size={18} />
        </a>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {services.map((service) => (
          <div className="border border-black/10 bg-white p-5" key={service}>
            <p className="mt-8 text-lg font-black leading-tight">{service}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function MuseumsBody({ locale }: { locale: Locale }) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-16">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {museums.map((museum) => (
          <article className="border border-black/10 bg-white p-5" key={museum.slug}>
            <Landmark className="text-[#2c6f6d]" size={24} />
            <h2 className="mt-4 text-2xl font-black leading-tight">{displayName(museum.name, locale)}</h2>
            <p className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-[#777]">
              {locale === "zh" ? "镇馆主题" : "Signature Treasure"}
            </p>
            <p className="mt-2 text-base font-bold leading-7">{museum.treasure}</p>
            <p className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-[#777]">
              {locale === "zh" ? "文创方向" : "Cultural Gift Edit"}
            </p>
            <p className="mt-2 text-base leading-7 text-[#444]">{museum.products}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function RegionsBody({ locale }: { locale: Locale }) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-16">
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {regions.map((region) => (
          <article className={`min-h-80 bg-gradient-to-br ${region.color} p-6`} key={region.name}>
            <MapPin size={24} />
            <h2 className="mt-16 text-3xl font-black">{displayName(region.name, locale)}</h2>
            <p className="mt-3 text-base leading-7 text-[#343434]">{region.theme}</p>
            <p className="mt-6 text-sm font-bold text-[#555]">
              {locale === "zh" ? "代表博物馆：" : "Featured museums: "} {region.museums}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
