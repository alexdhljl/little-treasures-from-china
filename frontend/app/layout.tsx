import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { siteConfig } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.domain),
  alternates: {
    canonical: siteConfig.domain,
    languages: {
      en: `${siteConfig.domain}/en`,
      zh: `${siteConfig.domain}/zh`,
    },
  },
  title: "Auctus Heritage | Museum-Inspired Cultural Gifts",
  description:
    "Discover museum-inspired cultural gifts, design objects, stationery, collectibles, and heritage collections curated by Auctus Heritage.",
  openGraph: {
    title: "Auctus Heritage | Museum-Inspired Cultural Gifts",
    description:
      "Curated cultural gifts, museum-inspired objects, stationery, collectibles, and heritage collections.",
    url: siteConfig.domain,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.logoPath,
        alt: siteConfig.name,
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Auctus Heritage | Museum-Inspired Cultural Gifts",
    description:
      "Curated cultural gifts, museum-inspired objects, stationery, collectibles, and heritage collections.",
  },
  icons: {
    icon: siteConfig.markPath,
    apple: siteConfig.markPath,
  },
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const language = (await headers()).get("x-site-locale") === "zh" ? "zh-CN" : "en";
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    legalName: siteConfig.legalName,
    url: siteConfig.domain,
    logo: `${siteConfig.domain}${siteConfig.logoPath}`,
    email: siteConfig.contactEmail,
    address: {
      "@type": "PostalAddress",
      addressLocality: "New York",
      addressRegion: "NY",
      addressCountry: "US",
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        email: siteConfig.contactEmail,
        contactType: "customer service",
        availableLanguage: ["English", "Chinese"],
      },
    ],
  };

  return (
    <html lang={language}>
      <body>
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
          type="application/ld+json"
        />
        {children}
      </body>
    </html>
  );
}
