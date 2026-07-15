import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, ImageOff, Mail } from "lucide-react";
import { AddToInquiryButton } from "@/components/AddToInquiryButton";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductUtilityActions } from "@/components/ProductUtilityActions";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { fetchPublicProductBySlug, fetchPublicProducts, fetchPublicRelatedProducts, isSupabaseConfigured } from "@/lib/supabase-rest";
import { displayFilter, displayName, displayProductAttribute, formatPriceForLocale, inventoryLabel, isLocale, localizedPath, productSubtitle, productTitle, type Locale } from "@/lib/i18n";
import type { Product } from "@/lib/products";

type ProductPageProps = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale) || !isSupabaseConfigured()) return { title: "Product | Auctus Heritage" };
  const product = await fetchPublicProductBySlug(slug);
  return { title: product ? `${(locale === "zh" ? product.seoTitleZh : product.seoTitle) || productTitle(product, locale)} | Auctus Heritage` : "Product Not Found", description: product ? ((locale === "zh" ? product.seoDescriptionZh : product.seoDescription) || (locale === "zh" ? product.shortDescriptionZh : product.shortDescription)) : undefined };
}

export default async function LocalizedProductPage({ params }: ProductPageProps) {
  const { locale: localeParam, slug } = await params;
  if (!isLocale(localeParam)) notFound();
  const locale: Locale = localeParam;
  const product = isSupabaseConfigured() ? await fetchPublicProductBySlug(slug) : null;
  if (!product) return <main className="min-h-screen bg-white"><SiteHeader locale={locale} path={`/products/${slug}`} /><section className="mx-auto max-w-5xl px-4 py-20"><h1 className="text-3xl font-black">{locale === "zh" ? "没有找到这个产品" : "Product not found"}</h1><a className="mt-6 inline-flex font-bold" href={localizedPath(locale, "/catalog")}>{locale === "zh" ? "返回产品目录" : "Back to products"}</a></section></main>;

  const explicitRelated = await fetchPublicRelatedProducts(product.relatedProductIds);
  const allProducts = explicitRelated.length ? [] : await fetchPublicProducts();
  const related = explicitRelated.length ? explicitRelated : allProducts.filter((item) => item.id !== product.id && (item.categoryId === product.categoryId || item.category === product.category)).slice(0, 4);
  const title = productTitle(product, locale);
  const shortDescription = locale === "zh" ? product.shortDescriptionZh || "产品介绍正在整理中。" : product.shortDescription;
  const longDescription = locale === "zh" ? product.longDescriptionZh || shortDescription : product.longDescription || shortDescription;
  const story = locale === "zh" ? product.storyZh || "产品故事正在整理中。" : product.story;
  const imageAlt = locale === "zh" ? product.altTextZh || title : product.altText;
  const origin = [product.city, displayName(product.province, locale) || product.province].filter(Boolean).join(", ") || (locale === "zh" ? "中国" : "China");

  return <main className="min-h-screen bg-white text-[#171717]">
    <SiteHeader locale={locale} path={`/products/${slug}`} />
    <nav className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-4 text-xs text-[#777] sm:px-6"><a href={localizedPath(locale, "/")}>{locale === "zh" ? "首页" : "Home"}</a><span>/</span><a href={localizedPath(locale, "/catalog")}>{locale === "zh" ? "全部产品" : "All Products"}</a><span>/</span><span className="max-w-[240px] truncate text-[#222]">{title}</span></nav>
    <section className="mx-auto grid max-w-7xl gap-7 px-4 pb-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:pb-16">
      <div className="lg:sticky lg:top-24 lg:self-start"><ProductGallery alt={imageAlt || title} images={product.images} /></div>
      <aside className="pt-1 lg:pt-3">
        <div className="flex items-start justify-between gap-5"><div><p className="commerce-kicker">{displayFilter(product.category, locale) || (locale === "zh" ? "文化礼品" : "Museum Gift")}</p><h1 className="mt-2 text-[26px] font-black leading-[1.15] sm:text-[32px]">{title}</h1>{productSubtitle(product, locale) ? <p className="mt-2 text-sm text-[#666]">{productSubtitle(product, locale)}</p> : null}</div><ProductUtilityActions title={title} /></div>
        <p className="mt-5 text-xl font-bold">{formatPriceForLocale(product, locale)}</p><p className="mt-5 text-[15px] leading-6 text-[#555]">{shortDescription}</p>
        <dl className="mt-6 border-t border-black/15 text-sm"><InfoRow label={locale === "zh" ? "博物馆" : "Museum"} value={displayName(product.museum, locale) || (locale === "zh" ? "精选合作机构" : "Curated partner")} /><InfoRow label={locale === "zh" ? "系列" : "Collection"} value={displayFilter(product.collection || product.officialCollection, locale) || (locale === "zh" ? "待确认" : "To be confirmed")} /><InfoRow label={locale === "zh" ? "起订量" : "MOQ"} value={String(product.moq || 1)} /><InfoRow label={locale === "zh" ? "材质" : "Material"} value={displayProductAttribute(product.materials, locale, locale === "zh" ? "待确认" : "To be confirmed")} /><InfoRow label={locale === "zh" ? "尺寸" : "Dimensions"} value={displayProductAttribute(product.dimensions, locale, locale === "zh" ? "待确认" : "To be confirmed")} /><InfoRow label={locale === "zh" ? "产地" : "Origin"} value={displayProductAttribute(product.origin || origin, locale)} /><InfoRow label={locale === "zh" ? "交付周期" : "Lead Time"} value={displayProductAttribute(product.leadTime || product.shippingNote, locale, locale === "zh" ? "报价时确认" : "Confirmed with quote")} /><InfoRow label={locale === "zh" ? "库存" : "Availability"} value={inventoryLabel(product.inventoryStatus, locale)} /></dl>
        <div className="mt-6"><AddToInquiryButton locale={locale} product={{ id: product.id, slug: product.slug, name: title, nameEn: product.englishName, nameZh: product.name, image: product.images[0] || "" }} /></div>
        <a className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[#273f48] px-5 text-sm font-black text-white transition hover:bg-[#171717]" href={`${localizedPath(locale, "/inquiry")}?product=${encodeURIComponent(product.slug)}`}>{locale === "zh" ? "获取报价" : "Request Quote"}<Mail size={17} /></a>
        <a className="mt-2 inline-flex min-h-11 w-full items-center justify-center border border-black/20 px-5 text-sm font-bold" href={localizedPath(locale, "/inquiry")}>{locale === "zh" ? "获取产品目录" : "Request Catalog"}</a>
        <p className="mt-3 text-center text-xs leading-5 text-[#777]">{locale === "zh" ? "价格、起订量、国际运输与交付时间将在报价中确认。" : "Pricing, MOQ, international shipping, and lead time are confirmed in your quote."}</p>
      </aside>
    </section>
    <section className="border-t border-black/10 py-10 sm:py-14"><div className="mx-auto max-w-4xl px-4 sm:px-6"><ContentBlock body={longDescription} title={locale === "zh" ? "产品介绍" : "Description"} /><ContentBlock body={story || (locale === "zh" ? "产品故事正在整理中。" : "The product story is being prepared.")} title={locale === "zh" ? "产品故事" : "Product Story"} /><div className="mt-10 border-t border-black/10 pt-8"><h2 className="text-2xl font-black">{locale === "zh" ? "文化来源" : "Museum Source"}</h2><p className="mt-4 text-[15px] leading-7 text-[#555]">{displayName(product.museum, locale) || (locale === "zh" ? "精选文化机构" : "Curated cultural institution")} · {displayProductAttribute(origin, locale)}{product.officialCollection ? ` · ${displayFilter(product.officialCollection, locale)}` : ""}</p></div></div></section>
    {product.images.length > 1 ? <section className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 sm:pb-16"><h2 className="mb-5 text-2xl font-black">{locale === "zh" ? "产品图片" : "Product Gallery"}</h2><div className="grid gap-4">{product.images.map((image, index) => <div className="overflow-hidden bg-[#f2f0eb]" key={`${image}-${index}`}><img alt={`${imageAlt || title} ${index + 1}`} className="h-auto max-h-[900px] w-full object-contain" loading="lazy" src={image} /></div>)}</div></section> : null}
    {related.length ? <RelatedProducts locale={locale} products={related} /> : null}
    <SiteFooter locale={locale} />
  </main>;
}

function InfoRow({ label, value }: { label: string; value: string }) { return <div className="grid grid-cols-[110px_1fr] gap-4 border-b border-black/10 py-3"><dt className="text-[#666]">{label}</dt><dd className="font-medium">{value}</dd></div>; }
function ContentBlock({ title, body }: { title: string; body?: string | null }) { return <article className="border-t border-black/10 py-8 first:border-0 first:pt-0"><h2 className="text-2xl font-black">{title}</h2><p className="mt-4 whitespace-pre-line text-[15px] leading-7 text-[#4d4d4d]">{body}</p></article>; }
function RelatedProducts({ products, locale }: { products: Product[]; locale: Locale }) { return <section className="border-t border-black/10 bg-[#f7f5f0] py-10 sm:py-14"><div className="mx-auto max-w-7xl px-4 sm:px-6"><div className="flex items-end justify-between"><h2 className="text-[26px] font-black">{locale === "zh" ? "相关推荐" : "Related Products"}</h2><a className="inline-flex items-center gap-1 text-sm font-bold" href={localizedPath(locale, "/catalog")}>{locale === "zh" ? "查看全部" : "View All"}<ArrowRight size={15} /></a></div><div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-4 sm:gap-5">{products.map((item) => <a className="group" href={localizedPath(locale, `/products/${item.slug}`)} key={item.id}><div className="grid aspect-[4/5] place-items-center overflow-hidden bg-white">{item.images[0] ? <img alt={productTitle(item, locale)} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" loading="lazy" src={item.images[0]} /> : <ImageOff className="text-[#999]" />}</div><h3 className="mt-3 line-clamp-2 text-[15px] font-bold leading-snug">{productTitle(item, locale)}</h3><p className="mt-1 text-sm text-[#555]">{formatPriceForLocale(item, locale)}</p></a>)}</div></div></section>; }
