import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { regions } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Regions of China | Little Treasures From China",
  description:
    "Explore Chinese cultural gifts by region, including Beijing, Shanghai, Sichuan, Hubei, Henan, Shaanxi, Gansu, Jiangsu, Guangdong, Yunnan, and Fujian.",
};

export default function RegionsPage() {
  return (
    <main className="min-h-screen bg-[#fffdf8] text-[#171717]">
      <SiteHeader />
      <section className="border-b border-black/10 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <p className="section-kicker">Regions of China</p>
          <h1 className="mt-4 max-w-5xl text-6xl font-black leading-[0.92] sm:text-7xl">
            China, organized by cultural mood.
          </h1>
          <p className="mt-7 max-w-2xl text-xl leading-8 text-[#4a4a4a]">
            Shop by place, story, landscape, and local museum culture. Each
            region suggests a different design language and gift direction.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {regions.map((region) => (
            <article
              className={`min-h-80 bg-gradient-to-br ${region.color} p-6`}
              key={region.name}
            >
              <MapPin size={24} />
              <h2 className="mt-16 text-3xl font-black">{region.name}</h2>
              <p className="mt-3 text-base leading-7 text-[#343434]">
                {region.theme}
              </p>
              <p className="mt-6 text-sm font-bold text-[#555]">
                Featured museums: {region.museums}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
