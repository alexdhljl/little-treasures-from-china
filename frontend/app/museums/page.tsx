import type { Metadata } from "next";
import { Landmark } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { museums } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Museums | Little Treasures From China",
  description:
    "Shop by Chinese museum, with signature treasures and museum-inspired cultural gift directions.",
};

export default function MuseumsPage() {
  return (
    <main className="min-h-screen bg-[#fffdf8] text-[#171717]">
      <SiteHeader />
      <section className="border-b border-black/10 bg-[#f6f2ea]">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <p className="section-kicker">Museums</p>
          <h1 className="mt-4 max-w-5xl text-6xl font-black leading-[0.92] sm:text-7xl">
            Cultural treasures, organized by museum.
          </h1>
          <p className="mt-7 max-w-2xl text-xl leading-8 text-[#4a4a4a]">
            Every museum path highlights a signature cultural anchor and a
            thoughtful product direction for gifts, education, and collecting.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {museums.map((museum) => (
            <a
              className="flex min-h-32 flex-col justify-between border border-black/10 bg-white p-4 transition hover:-translate-y-1 hover:border-[#2c6f6d] hover:shadow-[0_18px_35px_rgba(0,0,0,0.08)]"
              href={`#${museum.slug}`}
              key={museum.slug}
            >
              <Landmark className="text-[#2c6f6d]" size={22} />
              <span className="text-lg font-black leading-tight">{museum.name}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {museums.map((museum, index) => (
            <article
              className="scroll-mt-28 border border-black/10 bg-white p-5"
              id={museum.slug}
              key={museum.slug}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2c6f6d]">
                    Museum {String(index + 1).padStart(2, "0")}
                  </p>
                  <h2 className="mt-3 text-2xl font-black leading-tight">
                    {museum.name}
                  </h2>
                </div>
                <Landmark className="shrink-0 text-[#f27a5e]" size={26} />
              </div>
              <div className="mt-8 grid gap-4">
                <div className="border-l-4 border-[#f9d95f] bg-[#fffdf8] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#777]">
                    Signature Treasure
                  </p>
                  <p className="mt-2 text-base font-bold leading-7">
                    {museum.treasure}
                  </p>
                </div>
                <div className="border-l-4 border-[#65c6c4] bg-[#fffdf8] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#777]">
                    Cultural Gift Edit
                  </p>
                  <p className="mt-2 text-base leading-7 text-[#444]">
                    {museum.products}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
