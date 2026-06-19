"use client";

import { SiteHeader } from "@/components/SiteHeader";
import { normalizeLocale } from "@/lib/i18n";

type CatalogErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function CatalogError({ reset }: CatalogErrorProps) {
  const locale = normalizeLocale(typeof window === "undefined" ? "en" : window.location.pathname.split("/")[1]);

  return (
    <main className="min-h-screen bg-[#fffdf8] text-[#171717]">
      <SiteHeader locale={locale} path="/catalog" />
      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-5 sm:py-24">
        <p className="section-kicker">{locale === "zh" ? "产品目录" : "Product Catalog"}</p>
        <h1 className="mt-4 text-5xl font-black leading-tight">
          {locale === "zh" ? "目录暂时没有加载成功。" : "The catalog did not load this time."}
        </h1>
        <p className="mt-5 text-lg leading-8 text-[#555]">
          {locale === "zh"
            ? "请稍后重试，或检查本地开发服务器和 Supabase 连接。"
            : "Please try again, or check the local dev server and Supabase connection."}
        </p>
        <button
          className="mt-8 rounded-full bg-[#171717] px-6 py-3 font-black text-white"
          onClick={reset}
          type="button"
        >
          {locale === "zh" ? "重新加载" : "Reload"}
        </button>
      </section>
    </main>
  );
}
