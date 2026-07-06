import { notFound } from "next/navigation";
import { InquiryPage } from "@/components/InquiryPage";
import { SiteHeader } from "@/components/SiteHeader";
import { isLocale } from "@/lib/i18n";

export default async function LocalizedInquiryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <main className="min-h-screen bg-white text-[#171717]"><SiteHeader locale={locale} path="/inquiry" /><InquiryPage locale={locale} /></main>;
}
