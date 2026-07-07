import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Little Treasures From China | Museum Gifts and Cultural Objects",
  description:
    "A curated museum gift and cultural object platform introducing beautiful products from China to North America.",
  icons: {
    icon: "/brand/little-treasures-from-china-logo.png",
    apple: "/brand/little-treasures-from-china-logo.png",
  },
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const language = (await headers()).get("x-site-locale") === "zh" ? "zh-CN" : "en";

  return (
    <html lang={language}>
      <body>{children}</body>
    </html>
  );
}
