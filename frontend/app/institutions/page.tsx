import type { Metadata } from "next";
import { Building2, CheckCircle2, Mail } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "For Institutions | Little Treasures From China",
  description:
    "Catalog and assortment support for museum shops, cultural institutions, educators, and gift buyers.",
};

const services = [
  "Curated museum gift assortments",
  "Educational object edits for classrooms and programs",
  "Seasonal cultural gift bundles",
  "Regional and museum-themed catalog requests",
  "North America-facing product storytelling",
  "Institutional conversation before checkout",
];

export default function InstitutionsPage() {
  return (
    <main className="min-h-screen bg-[#fffdf8] text-[#171717]">
      <SiteHeader />
      <section className="border-b border-black/10 bg-[#171717] text-white">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <p className="section-kicker text-[#9ee5df]">For Institutions</p>
          <h1 className="mt-4 max-w-5xl text-6xl font-black leading-[0.92] sm:text-7xl">
            Catalogs for museum shops, cultural programs, and gift buyers.
          </h1>
          <p className="mt-7 max-w-2xl text-xl leading-8 text-white/75">
            We help institutions discover Chinese cultural products that feel
            thoughtful, well-designed, and easy to explain to visitors.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <Building2 className="text-[#2c6f6d]" size={34} />
          <h2 className="mt-5 text-4xl font-black leading-tight">
            Built for inquiry-based commerce first.
          </h2>
          <p className="mt-5 text-lg leading-8 text-[#555]">
            We are not starting as a crowded checkout marketplace. The first
            version is designed for curated selections, catalog requests,
            product conversations, and thoughtful sourcing.
          </p>
          <a
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#171717] px-6 py-4 text-base font-extrabold text-white transition hover:bg-[#2c6f6d]"
            href="/contact"
          >
            Request an institutional catalog <Mail size={18} />
          </a>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {services.map((service) => (
            <div className="border border-black/10 bg-white p-5" key={service}>
              <CheckCircle2 className="text-[#f27a5e]" size={22} />
              <p className="mt-8 text-lg font-black leading-tight">{service}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
