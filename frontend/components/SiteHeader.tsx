"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Menu, Search, UserRound } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import type { CmsCategory } from "@/lib/cms";
import type { Locale } from "@/lib/i18n";
import { dictionary, localizedPath } from "@/lib/i18n";
import { fetchCategories, isSupabaseConfigured } from "@/lib/supabase-rest";

const secondaryNavItems = [
  { key: "collections", href: "/collections" },
  { key: "new", href: "/catalog?sort=new" },
  { key: "about", href: "/about" },
] as const;

type SiteHeaderProps = {
  locale?: Locale;
  path?: string;
};

function withLocale(locale: Locale, href: string) {
  const [pathname, query] = href.split("?");
  return `${localizedPath(locale, pathname)}${query ? `?${query}` : ""}`;
}

function languageHref(nextLocale: Locale, path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return localizedPath(nextLocale, normalized);
}

export function SiteHeader({ locale = "en", path = "/" }: SiteHeaderProps) {
  const t = dictionary[locale];
  const [categories, setCategories] = useState<CmsCategory[]>([]);
  useEffect(() => {
    if (isSupabaseConfigured()) fetchCategories().then(setCategories).catch(() => setCategories([]));
  }, []);
  const productCategories = categories.filter((item) => item.kind === "product").slice(0, 5);
  const giftMenu = [
    [t.giftMenu.occasion, t.giftMenu.occasions],
    [t.giftMenu.recipient, t.giftMenu.recipients],
    [t.giftMenu.budget, t.giftMenu.budgets],
  ] as const;

  return (
    <header className="sticky top-0 z-30 border-b border-black/10 bg-[#fffdf8]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-5 lg:py-6">
        <a className="block min-w-0" href={localizedPath(locale, "/")}>
          <BrandLogo className="w-[152px] sm:w-[210px] lg:w-[238px]" priority />
        </a>
        <div className="hidden items-center gap-5 lg:flex">
          <div className="flex items-center gap-2 text-sm font-bold">
            <a className={locale === "en" ? "text-[#171717]" : "text-[#777]"} href={languageHref("en", path)}>
              EN
            </a>
            <span className="text-[#bbb]">/</span>
            <a className={locale === "zh" ? "text-[#171717]" : "text-[#777]"} href={languageHref("zh", path)}>
              中文
            </a>
          </div>
          <a className="text-sm font-bold text-[#333] transition hover:text-[#2c6f6d]" href={localizedPath(locale, "/contact")}>
            {t.nav.contact}
          </a>
          <a
            className="inline-flex items-center gap-2 rounded-full bg-[#171717] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#2c6f6d]"
            href={localizedPath(locale, "/contact")}
          >
            {t.requestCatalog} <ArrowRight size={16} />
          </a>
        </div>
        <a
          className="hidden items-center gap-1.5 rounded-full bg-[#171717] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#2c6f6d] sm:inline-flex lg:hidden"
          href={localizedPath(locale, "/contact")}
        >
          {t.requestCatalog} <ArrowRight size={14} />
        </a>
      </div>

      <div className="border-t border-black/10 bg-white/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-2.5 sm:px-5 lg:py-4">
          <nav className="hidden items-center gap-8 text-base font-medium text-[#171717] lg:flex">
            <button aria-label="Open navigation menu" className="grid size-8 place-items-center" type="button">
              <Menu size={24} />
            </button>
            <div className="group relative py-2">
            <a className="font-black uppercase tracking-[0.12em] transition hover:text-[#2c6f6d]" href={localizedPath(locale, "/catalog")}>
              {t.nav.gifts}
            </a>
            <div className="invisible absolute left-0 top-full z-40 grid w-[760px] translate-y-2 grid-cols-3 gap-6 border border-black/10 bg-white p-6 opacity-0 shadow-[0_22px_60px_rgba(0,0,0,0.12)] transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
              {giftMenu.map(([section, items]) => (
                <div key={section}>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2c6f6d]">
                    {section}
                  </p>
                  <div className="mt-4 grid gap-3">
                    {items.map((item) => (
                      <a
                        className="text-sm font-bold text-[#333] transition hover:text-[#f27a5e]"
                        href={`${localizedPath(locale, "/catalog")}?gift=${encodeURIComponent(item)}`}
                        key={item}
                      >
                        {item}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {productCategories.map((category) => (
            <a
              className="transition hover:text-[#2c6f6d]"
              href={`${localizedPath(locale, "/catalog")}?category=${encodeURIComponent(category.name)}`}
              key={category.id}
            >
              {locale === "zh" ? category.nameZh || category.name : category.name}
            </a>
          ))}
          {secondaryNavItems.map((item) => (
            <a
              className="transition hover:text-[#2c6f6d]"
              href={withLocale(locale, item.href)}
              key={item.key}
            >
              {t.nav[item.key]}
            </a>
          ))}
          </nav>
          <div className="ml-auto hidden items-center gap-5 lg:flex">
            <UserRound size={22} />
            <Search size={24} />
          </div>
          <details className="group w-full lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-black">
              <span className="inline-flex items-center gap-2">
                <Menu size={18} />
                {t.nav.gifts}
              </span>
              <a
                className="rounded-full bg-[#171717] px-3 py-1.5 text-xs font-bold text-white sm:hidden"
                href={localizedPath(locale, "/contact")}
              >
                {t.requestCatalog}
              </a>
            </summary>
            <div className="mt-3 grid gap-3 border-t border-black/10 pt-3 text-sm font-bold">
              <div className="grid grid-cols-2 gap-2">
                {productCategories.map((category) => (
                  <a
                    className="border border-black/10 bg-white px-3 py-2"
                    href={`${localizedPath(locale, "/catalog")}?category=${encodeURIComponent(category.name)}`}
                    key={category.id}
                  >
                    {locale === "zh" ? category.nameZh || category.name : category.name}
                  </a>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <a className="border border-black/10 bg-white px-3 py-2" href={localizedPath(locale, "/collections")}>
                  {t.nav.collections}
                </a>
                <a className="border border-black/10 bg-white px-3 py-2" href={localizedPath(locale, "/about")}>
                  {t.nav.about}
                </a>
                <a className="border border-black/10 bg-white px-3 py-2" href={localizedPath(locale, "/contact")}>
                  {t.nav.contact}
                </a>
                <a className="border border-black/10 bg-white px-3 py-2" href={languageHref(locale === "en" ? "zh" : "en", path)}>
                  {locale === "en" ? "中文" : "EN"}
                </a>
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
