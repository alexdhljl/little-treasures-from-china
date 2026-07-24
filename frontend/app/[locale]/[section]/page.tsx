import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, Building2, Landmark, Mail, MapPin, Sparkles } from "lucide-react";
import { ContactInquiryPanel } from "@/components/ContactInquiryPanel";
import { AboutCompany } from "@/components/AboutCompany";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import type { CmsCollection, CmsMuseum, CmsStory } from "@/lib/cms";
import { dictionary, displayFilter, displayName, isLocale, localizedPath, type Locale } from "@/lib/i18n";
import { siteConfig } from "@/lib/site";
import { fetchPublicCms, isSupabaseConfigured } from "@/lib/supabase-rest";

const sections = ["about", "collections", "contact", "institutions", "museums", "regions"] as const;
type Section = (typeof sections)[number];
const contactShowcaseImage = "/images/contact-showcase.webp";

type PageProps = {
  params: Promise<{ locale: string; section: string }>;
};

function isSection(value: string): value is Section {
  return sections.includes(value as Section);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: localeParam, section: sectionParam } = await params;
  if (!isLocale(localeParam) || !isSection(sectionParam)) {
    return { title: "Auctus Heritage" };
  }

  const locale: Locale = localeParam;
  const page = dictionary[locale].staticPages[sectionParam];
  const path = `${siteConfig.domain}/${locale}/${sectionParam}`;

  return {
    title: `${page.title} | Auctus Heritage`,
    description: page.intro,
    alternates: {
      canonical: path,
      languages: {
        en: `${siteConfig.domain}/en/${sectionParam}`,
        zh: `${siteConfig.domain}/zh/${sectionParam}`,
      },
    },
    openGraph: {
      title: `${page.title} | Auctus Heritage`,
      description: page.intro,
      url: path,
      siteName: siteConfig.name,
      type: "website",
    },
  };
}

export default async function LocalizedSectionPage({ params }: PageProps) {
  const { locale: localeParam, section: sectionParam } = await params;
  if (!isLocale(localeParam) || !isSection(sectionParam)) {
    notFound();
  }
  const locale: Locale = localeParam;
  const t = dictionary[locale].staticPages[sectionParam];
  const cms = isSupabaseConfigured() ? await fetchPublicCms() : { categories: [], museums: [], collections: [], stories: [], settings: [] };

  return (
    <main className="min-h-screen bg-[#fffdf8] text-[#171717]">
      <SiteHeader locale={locale} path={`/${sectionParam}`} />
      <section className={`border-b border-black/10 ${sectionParam === "institutions" ? "bg-[#171717] text-white" : "bg-white"}`}>
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-5 sm:py-16 lg:py-20">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-black/15 bg-[#fffdf8] px-4 py-2 text-sm font-bold text-[#171717]">
            <Sparkles size={16} className="text-[#f27a5e]" />
            {t.kicker}
          </div>
          <h1 className="max-w-5xl text-4xl font-black leading-[0.98] sm:text-6xl lg:text-7xl">
            {t.title}
          </h1>
          <p className={`mt-5 max-w-2xl text-base leading-7 sm:mt-7 sm:text-xl sm:leading-8 ${sectionParam === "institutions" ? "text-white/75" : "text-[#4a4a4a]"}`}>
            {t.intro}
          </p>
        </div>
      </section>

      {sectionParam === "about" ? <AboutCompany locale={locale} /> : null}
      {sectionParam === "collections" ? <CollectionsBody collections={cms.collections} locale={locale} /> : null}
      {sectionParam === "contact" ? <ContactInquiryBody heroImage={contactShowcaseImage} locale={locale} /> : null}
      {sectionParam === "institutions" ? <InstitutionsBody locale={locale} /> : null}
      {sectionParam === "museums" ? <MuseumsBody locale={locale} museums={cms.museums} /> : null}
      {sectionParam === "regions" ? <RegionsBody locale={locale} museums={cms.museums} /> : null}
      <SiteFooter locale={locale} />
    </main>
  );
}

function AboutBody({ locale, story }: { locale: Locale; story?: CmsStory }) {
  const page = dictionary[locale].staticPages.about;
  return (
    <section className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-5 sm:py-16 lg:grid-cols-[280px_1fr] lg:gap-12 lg:py-20">
      <aside>
        <p className="section-kicker">{locale === "zh" ? "我们的故事" : "Our Story"}</p>
        <div className="mt-6 h-3 w-28 bg-[#f9d95f]" />
        <div className="mt-3 h-3 w-20 bg-[#65c6c4]" />
        <div className="mt-3 h-3 w-14 bg-[#f27a5e]" />
      </aside>
      <article className="max-w-3xl">
        {(story ? (locale === "zh" ? story.bodyZh : story.body).split(/\n\s*\n/).filter(Boolean) : page.body).map((paragraph, index) => (
          <p
            className={index === 2 || index === 3 ? "mt-8 text-2xl font-black leading-tight sm:mt-10 sm:text-3xl" : "mt-5 text-base leading-8 text-[#3f3f3f] sm:mt-6 sm:text-xl sm:leading-9"}
            key={paragraph}
          >
            {paragraph}
          </p>
        ))}
      </article>
    </section>
  );
}

function CollectionsBody({ locale, collections }: { locale: Locale; collections: CmsCollection[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-5 sm:py-16">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {collections.map((collection) => (
          <a
            className="overflow-hidden border border-black/10 bg-white transition hover:-translate-y-1 hover:shadow-[0_18px_35px_rgba(0,0,0,0.08)]"
            href={`${localizedPath(locale, "/catalog")}?collection=${encodeURIComponent(collection.name)}`}
            key={collection.id}
          >
            <div className="h-28 bg-[#ece9e1] sm:h-40">{collection.bannerImage ? <img alt="" className="h-full w-full object-cover" loading="lazy" src={collection.bannerImage} /> : null}</div>
            <div className="p-4 sm:p-5">
              <h2 className="text-xl font-black sm:text-2xl">{locale === "zh" ? collection.nameZh || displayFilter(collection.name, locale) : collection.name}</h2>
              <p className="mt-3 text-[15px] leading-6 text-[#555] sm:min-h-20 sm:text-sm">{locale === "zh" ? collection.descriptionZh || "系列介绍正在整理中。" : collection.description}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-black sm:mt-6">
                {locale === "zh" ? "查看产品" : "View products"} <ArrowRight size={15} />
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

function ContactInquiryBody({ locale, heroImage }: { locale: Locale; heroImage: string }) {
  return <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-5 sm:py-16 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10"><div className="relative aspect-[4/3] max-h-[420px] overflow-hidden bg-[#f1eee7] sm:min-h-[520px] sm:max-h-none">{heroImage ? <img alt={locale === "zh" ? "精选文化礼品目录" : "Curated cultural gifts catalog"} className="h-full w-full object-cover" src={heroImage} /> : null}</div><aside className="lg:sticky lg:top-24 lg:self-start"><ContactInquiryPanel locale={locale} /></aside></section>;
}

function ContactBody({ locale, heroImage }: { locale: Locale; heroImage: string }) {
  const t = dictionary[locale].staticPages.contact;
  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-5 sm:py-16 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10">
      <div className="relative aspect-[4/3] max-h-[420px] overflow-hidden bg-[#f1eee7] sm:min-h-[520px] sm:max-h-none">
        {heroImage ? <img
          alt={locale === "zh" ? "精选中国文化礼品目录" : "Curated Chinese museum gifts catalog"}
          className="h-full w-full object-cover"
          src={heroImage}
        /> : null}
      </div>
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="section-kicker">{t.kicker}</p>
        <h2 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">{t.title}</h2>
        <p className="mt-4 text-base leading-7 text-[#555] sm:mt-5 sm:text-lg sm:leading-8">{t.intro}</p>
        <div className="mt-6 border-y border-black/10 py-5 sm:mt-8 sm:py-6">
          <dl className="grid gap-3 text-sm sm:gap-4">
            <div className="grid grid-cols-[110px_1fr] gap-3 sm:grid-cols-[150px_1fr] sm:gap-4">
              <dt className="text-[#555]">{locale === "zh" ? "价格" : "Estimated Price"}</dt>
              <dd className="font-black">$12 - $45 per item</dd>
            </div>
            <div className="grid grid-cols-[110px_1fr] gap-3 sm:grid-cols-[150px_1fr] sm:gap-4">
              <dt className="text-[#555]">{locale === "zh" ? "配送" : "Shipping"}</dt>
              <dd>{locale === "zh" ? "国际配送单独报价" : "International shipping quoted separately"}</dd>
            </div>
          </dl>
        </div>
        <a
          className="mt-6 inline-flex items-center justify-center gap-2 bg-[#2f4650] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#171717] sm:mt-8 sm:px-6 sm:py-4 sm:text-base"
          href={`mailto:${siteConfig.contactEmail}?subject=Auctus%20Heritage%20Order%20Inquiry`}
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
    <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-5 sm:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10">
      <div>
        <Building2 className="text-[#2c6f6d]" size={34} />
        <h2 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">
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
            <p className="mt-4 text-base font-black leading-tight sm:mt-8 sm:text-lg">{service}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function MuseumsBody({ locale, museums }: { locale: Locale; museums: CmsMuseum[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-5 sm:py-16">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {museums.map((museum) => (
          <article className="overflow-hidden border border-black/10 bg-white" key={museum.id}>
            <div className="h-40 bg-[#ece9e1]">{museum.coverImage ? <img alt="" className="h-full w-full object-cover" loading="lazy" src={museum.coverImage} /> : null}</div>
            <div className="p-4 sm:p-5">
            <Landmark className="text-[#2c6f6d]" size={24} />
            <h2 className="mt-4 text-xl font-black leading-tight sm:text-2xl">{locale === "zh" ? museum.nameZh || displayName(museum.name, locale) : museum.name}</h2>
            <p className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-[#777]">
              {locale === "zh" ? "镇馆主题" : "Signature Treasure"}
            </p>
            <p className="mt-2 text-base font-bold leading-7">{locale === "zh" ? museum.descriptionZh || "博物馆介绍正在整理中。" : museum.description}</p>
            <p className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-[#777]">
              {locale === "zh" ? "文创方向" : "Cultural Gift Edit"}
            </p>
            <p className="mt-2 line-clamp-4 text-base leading-7 text-[#444]">{locale === "zh" ? museum.storyZh || "文创故事正在整理中。" : museum.story}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function RegionsBody({ locale, museums }: { locale: Locale; museums: CmsMuseum[] }) {
  const regions = Object.entries(museums.reduce<Record<string, CmsMuseum[]>>((groups, museum) => {
    const region = museum.province || (locale === "zh" ? "其他" : "Other");
    groups[region] = [...(groups[region] || []), museum];
    return groups;
  }, {}));
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-5 sm:py-16">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {regions.map(([region, regionMuseums]) => (
          <article className="min-h-56 bg-[#ece9e1] p-4 sm:min-h-72 sm:p-6" key={region}>
            <MapPin size={24} />
            <h2 className="mt-10 text-2xl font-black sm:mt-16 sm:text-3xl">{displayName(region, locale)}</h2>
            <p className="mt-3 text-base leading-7 text-[#343434]">{regionMuseums.map((museum) => locale === "zh" ? museum.nameZh || displayName(museum.name, locale) : museum.name).join(" · ")}</p>
            <p className="mt-6 text-sm font-bold text-[#555]">
              {regionMuseums.length} {locale === "zh" ? "家博物馆" : regionMuseums.length === 1 ? "museum" : "museums"}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
