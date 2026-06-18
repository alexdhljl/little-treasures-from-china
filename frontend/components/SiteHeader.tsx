import { ArrowRight, Gift, Menu, Search, UserRound } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { categoryOptions, dictionary, localizedPath } from "@/lib/i18n";

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
  const giftMenu = [
    [t.giftMenu.occasion, t.giftMenu.occasions],
    [t.giftMenu.recipient, t.giftMenu.recipients],
    [t.giftMenu.budget, t.giftMenu.budgets],
  ] as const;

  return (
    <header className="sticky top-0 z-30 border-b border-black/10 bg-[#fffdf8]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6">
        <a className="flex min-w-0 items-center gap-4" href={localizedPath(locale, "/")}>
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#171717] text-white">
            <Gift size={19} />
          </span>
          <span className="min-w-0">
            <span className="block text-2xl font-black leading-none sm:text-4xl">
              {t.brand}
            </span>
            <span className="mt-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[#666]">
              {t.curator}
            </span>
          </span>
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
          className="inline-flex items-center gap-2 rounded-full bg-[#171717] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#2c6f6d] lg:hidden"
          href={localizedPath(locale, "/contact")}
        >
          {t.requestCatalog} <ArrowRight size={16} />
        </a>
      </div>

      <div className="border-t border-black/10 bg-white/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-5 py-4">
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
          {categoryOptions[locale].map(([value, label]) => (
            <a
              className="transition hover:text-[#2c6f6d]"
              href={`${localizedPath(locale, "/catalog")}?category=${encodeURIComponent(value)}`}
              key={value}
            >
              {label}
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
          <nav className="flex w-full items-center justify-between text-sm font-bold lg:hidden">
            <a href={localizedPath(locale, "/catalog")}>{t.nav.gifts}</a>
            <a href={localizedPath(locale, "/collections")}>{t.nav.collections}</a>
            <a href={localizedPath(locale, "/about")}>{t.nav.about}</a>
            <a href={languageHref(locale === "en" ? "zh" : "en", path)}>{locale === "en" ? "中文" : "EN"}</a>
          </nav>
        </div>
      </div>
    </header>
  );
}
