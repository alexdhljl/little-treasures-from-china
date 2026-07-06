"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ClipboardList, Menu, Search, X } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import type { CmsCategory } from "@/lib/cms";
import type { Locale } from "@/lib/i18n";
import { dictionary, localizedPath } from "@/lib/i18n";
import { useInquiryCart } from "@/lib/inquiry-cart";
import { fetchCategories, isSupabaseConfigured } from "@/lib/supabase-rest";

type SiteHeaderProps = { locale?: Locale; path?: string };

function withLocale(locale: Locale, href: string) {
  const [pathname, query] = href.split("?");
  return `${localizedPath(locale, pathname)}${query ? `?${query}` : ""}`;
}

function languageHref(nextLocale: Locale, path: string) {
  return localizedPath(nextLocale, path.startsWith("/") ? path : `/${path}`);
}

export function SiteHeader({ locale = "en", path = "/" }: SiteHeaderProps) {
  const t = dictionary[locale];
  const { count } = useInquiryCart();
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<CmsCategory[]>([]);

  useEffect(() => {
    if (isSupabaseConfigured()) fetchCategories().then(setCategories).catch(() => setCategories([]));
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const productCategories = categories.filter((item) => item.kind === "product").slice(0, 5);
  const close = () => setOpen(false);
  const drawerCategories = [
    ["Gifts", "/catalog"], ["Home & Living", "/catalog?category=Home%20%26%20Living"],
    ["Stationery", "/catalog?category=Stationery%20%26%20Office"], ["Kids", "/catalog?category=Kids%20%26%20Family"],
    ["Wear", "/catalog?category=Wear%20%26%20Accessories"], ["Jewelry", "/catalog?category=Jewelry"],
    ["Tea & Lifestyle", "/catalog?category=Tea%20%26%20Lifestyle"], ["Accessories", "/catalog?category=Accessories"],
  ];

  return <>
    <header className="sticky top-0 z-30 border-b border-black/10 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6 sm:py-3 lg:py-4">
        <button aria-label="Open navigation menu" className="grid size-9 shrink-0 place-items-center" onClick={() => setOpen(true)} type="button"><Menu size={22} /></button>
        <a className="block min-w-0" href={localizedPath(locale, "/")}><BrandLogo className="w-[104px] sm:w-[154px] lg:w-[198px]" priority /></a>
        <div className="ml-auto hidden items-center gap-5 lg:flex">
          <div className="flex items-center gap-2 text-sm font-bold"><a className={locale === "en" ? "text-[#171717]" : "text-[#777]"} href={languageHref("en", path)}>EN</a><span className="text-[#bbb]">/</span><a className={locale === "zh" ? "text-[#171717]" : "text-[#777]"} href={languageHref("zh", path)}>中文</a></div>
          <a className="text-sm font-bold text-[#333] hover:text-[#2c6f6d]" href={localizedPath(locale, "/contact")}>{t.nav.contact}</a>
          <a className="inline-flex items-center gap-2 bg-[#171717] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#2c6f6d]" href={localizedPath(locale, "/inquiry")}>{t.requestCatalog}<ArrowRight size={16} /></a>
        </div>
        <a aria-label={locale === "zh" ? "询价单" : "Inquiry list"} className="relative grid size-10 place-items-center" href={localizedPath(locale, "/inquiry")}><ClipboardList size={21} />{count ? <span className="absolute right-0 top-0 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#b5192e] px-1 text-[10px] font-black text-white">{count > 99 ? "99+" : count}</span> : null}</a>
      </div>
      <div className="border-t border-black/10 bg-white/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-2 sm:px-6 lg:py-2.5">
          <nav className="hidden items-center gap-7 text-sm font-medium text-[#171717] lg:flex">
            <a className="font-black uppercase tracking-[0.12em] hover:text-[#2c6f6d]" href={localizedPath(locale, "/catalog")}>{t.nav.gifts}</a>
            {productCategories.map((category) => <a className="hover:text-[#2c6f6d]" href={`${localizedPath(locale, "/catalog")}?category=${encodeURIComponent(category.name)}`} key={category.id}>{locale === "zh" ? category.nameZh || category.name : category.name}</a>)}
            <a className="hover:text-[#2c6f6d]" href={localizedPath(locale, "/collections")}>{t.nav.collections}</a><a className="hover:text-[#2c6f6d]" href={withLocale(locale, "/catalog?sort=new")}>{t.nav.new}</a><a className="hover:text-[#2c6f6d]" href={localizedPath(locale, "/about")}>{t.nav.about}</a>
          </nav>
          <div className="ml-auto hidden items-center gap-5 lg:flex"><Search size={22} /></div>
          <div className="flex w-full items-center justify-between text-sm font-black lg:hidden"><span>{locale === "zh" ? "浏览礼品" : "Browse Gifts"}</span><a className="text-xs text-[#555]" href={locale === "en" ? languageHref("zh", path) : languageHref("en", path)}>{locale === "en" ? "中文" : "EN"}</a></div>
        </div>
      </div>
    </header>

    <div aria-hidden={!open} className={`fixed inset-0 z-[60] bg-black/45 transition ${open ? "visible opacity-100" : "invisible opacity-0"}`} onClick={close} />
    <aside aria-label="Main navigation" className={`fixed inset-y-0 left-0 z-[70] w-[min(88vw,390px)] overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex items-center justify-between border-b border-black/10 px-5 py-4"><BrandLogo className="w-[165px]" /><button aria-label="Close navigation menu" className="grid size-10 place-items-center" onClick={close} type="button"><X size={22} /></button></div>
      <div className="px-5 py-5">
        <DrawerSection title={locale === "zh" ? "语言" : "Language"}><div className="flex gap-4 text-sm font-bold"><a href={languageHref("en", path)} onClick={close}>English</a><span className="text-[#bbb]">/</span><a href={languageHref("zh", path)} onClick={close}>中文</a></div></DrawerSection>
        <DrawerSection title={locale === "zh" ? "浏览" : "Browse"}><DrawerLinks close={close} locale={locale} links={[["Home", "/"], ["New Arrivals", "/catalog?sort=new"], ["Best Sellers", "/catalog?featured=true"], ["All Products", "/catalog"], ["Museum Collections", "/collections"]]} /></DrawerSection>
        <DrawerSection title={locale === "zh" ? "分类" : "Categories"}><DrawerLinks close={close} locale={locale} links={drawerCategories} /></DrawerSection>
        <DrawerSection title={locale === "zh" ? "商务" : "Business"}><DrawerLinks close={close} locale={locale} links={[["Request Catalog", "/inquiry"], ["Request Quote", "/inquiry"], ["Wholesale Inquiry", "/institutions"]]} /></DrawerSection>
        <DrawerSection title={locale === "zh" ? "关于" : "About"}><DrawerLinks close={close} locale={locale} links={[["About", "/about"], ["Contact", "/contact"]]} /></DrawerSection>
      </div>
      <div className="border-t border-black/10 bg-[#f5f3ed] px-5 py-5"><p className="text-sm font-black">Auctus Lab</p><a className="mt-1 block text-sm text-[#555]" href="mailto:hello@auctuslab.com">hello@auctuslab.com</a></div>
    </aside>
  </>;
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="border-b border-black/10 py-5 first:pt-0"><p className="mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-[#2c6f6d]">{title}</p>{children}</section>; }
function DrawerLinks({ links, locale, close }: { links: string[][]; locale: Locale; close: () => void }) { return <div className="grid grid-cols-2 gap-x-4 gap-y-3">{links.map(([label, href]) => <a className="text-sm font-bold leading-5 hover:text-[#2c6f6d]" href={withLocale(locale, href)} key={`${label}-${href}`} onClick={close}>{label}</a>)}</div>; }
