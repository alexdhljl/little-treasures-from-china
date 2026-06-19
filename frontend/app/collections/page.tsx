import type { Metadata } from "next";
import { ArrowRight, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { collections } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Collections | Little Treasures From China",
  description:
    "Explore curated Chinese museum gift collections, from Forbidden City objects to Dunhuang, Sanxingdui, characters, kids, and festival gifts.",
};

export default function CollectionsPage() {
  return (
    <main className="min-h-screen bg-[#fffdf8] text-[#171717]">
      <SiteHeader />
      <section className="border-b border-black/10 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-5 sm:py-16 lg:py-20">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-black/15 bg-[#fffdf8] px-4 py-2 text-sm font-bold">
            <Sparkles size={16} className="text-[#f27a5e]" />
            Collections
          </div>
          <h1 className="max-w-5xl text-4xl font-black leading-[0.98] sm:text-6xl lg:text-7xl">
            Curated shelves of museum-inspired gifts.
          </h1>
          <p className="mt-7 max-w-2xl text-xl leading-8 text-[#4a4a4a]">
            Each collection starts with a cultural story, then becomes a small
            world of giftable objects, learning tools, home pieces, and keepsakes.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {collections.map((collection) => (
            <article
              className="overflow-hidden border border-black/10 bg-white"
              key={collection.name}
            >
              <div className={`h-32 ${collection.color}`} />
              <div className="p-5">
                <h2 className="text-2xl font-black">{collection.name}</h2>
                <p className="mt-3 min-h-20 text-sm leading-6 text-[#555]">
                  {collection.theme}
                </p>
                <ul className="mt-6 space-y-2">
                  {collection.products.map((product) => (
                    <li className="flex items-center gap-2 text-sm font-bold" key={product}>
                      <ArrowRight size={15} className="text-[#2c6f6d]" />
                      {product}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
