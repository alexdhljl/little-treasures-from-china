"use client";

import { Check, ClipboardPlus } from "lucide-react";
import { useState } from "react";
import { useInquiryCart } from "@/lib/inquiry-cart";
import type { Locale } from "@/lib/i18n";

export function AddToInquiryButton({ product, locale }: { product: { id: string; slug: string; name: string; nameEn?: string; nameZh?: string; image: string }; locale: Locale }) {
  const { addItem } = useInquiryCart();
  const [added, setAdded] = useState(false);
  return <button className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[#171717] px-5 text-sm font-black text-white transition hover:bg-[#2c6f6d]" onClick={() => { addItem({ productId: product.id, slug: product.slug, name: product.name, nameEn: product.nameEn, nameZh: product.nameZh, image: product.image }); setAdded(true); window.setTimeout(() => setAdded(false), 1800); }} type="button">{added ? <Check size={18} /> : <ClipboardPlus size={18} />}{added ? (locale === "zh" ? "已加入询价单" : "Added to Inquiry") : (locale === "zh" ? "加入询价单" : "Add to Inquiry")}</button>;
}
