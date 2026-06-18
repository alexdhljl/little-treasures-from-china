import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Little Treasures From China | Museum Gifts and Cultural Objects",
  description:
    "A curated museum gift and cultural object platform introducing beautiful products from China to North America.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
