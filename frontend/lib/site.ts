export const siteConfig = {
  name: "Auctus Heritage",
  legalName: "Auctus Lab LLC",
  domain: "https://auctusheritage.com",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@auctusheritage.com",
  partnerEmail: process.env.NEXT_PUBLIC_PARTNER_EMAIL || "partner@auctusheritage.com",
  careersEmail: process.env.NEXT_PUBLIC_CAREERS_EMAIL || "careers@auctusheritage.com",
  inquiryEmail: process.env.INQUIRY_NOTIFICATION_EMAIL || "inquiry@auctusheritage.com",
  description: "Curated Cultural Gifts and Museum-Inspired Objects",
  legalLine: "Auctus Heritage is a brand operated by Auctus Lab LLC.",
  location: "New York, USA",
  logoPath: "/brand/logo-horizontal.png",
  markPath: "/brand/logo-icon.png",
  faviconPath: "/brand/favicon.png",
  appleTouchIconPath: "/brand/apple-touch-icon.png",
  ogImagePath: "/brand/og-image.png",
};

export const siteConfigZh = {
  description: "文化艺术与博物馆文创精选",
  legalLine: "Auctus Heritage 是由 Auctus Lab LLC 运营的文化产品品牌。",
};
