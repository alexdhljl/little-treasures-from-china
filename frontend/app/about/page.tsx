import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "About Us | Little Treasures From China",
  description:
    "The story behind Little Treasures From China, a curated cultural gift platform by people who love Chinese culture, museum collections, and thoughtful design.",
};

const storyParagraphs = [
  "We are a group of people who love Chinese culture, museum collections, thoughtful design, and meaningful gifts.",
  "Over the years, we discovered that many of China's most beautiful cultural products never make it beyond museum gift shops, historic sites, and local cultural institutions. Hidden among them are wonderful objects inspired by ancient bronzes, traditional crafts, historic architecture, literature, festivals, and everyday stories.",
  "Little Treasures From China was created to share these discoveries with friends, families, collectors, educators, and cultural enthusiasts around the world.",
  "We believe a small object can carry a story.",
  "A bookmark can inspire curiosity about history.",
  "A magnet can remind someone of a place they love.",
  "A gift can become a bridge between cultures.",
  "Our mission is simple: To curate beautiful cultural treasures from China and help them find a place in everyday life.",
  "From museum gifts and heritage-inspired designs to educational objects and collectible keepsakes, we carefully select products that are meaningful, well-designed, and full of stories worth sharing.",
  "Whether you're looking for a thoughtful gift, a classroom conversation starter, a museum-inspired collectible, or simply a beautiful object to brighten your day, we hope you'll discover something special here.",
  "Thank you for exploring these little treasures with us.",
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#fffdf8] text-[#171717]">
      <SiteHeader />

      <section className="border-b border-black/10 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-black/15 bg-[#fffdf8] px-4 py-2 text-sm font-bold">
              <Sparkles size={16} className="text-[#f27a5e]" />
              About Us
            </div>
            <h1 className="max-w-3xl text-6xl font-black leading-[0.92] sm:text-7xl">
              Little Treasures From China
            </h1>
          </div>
          <p className="max-w-xl text-xl leading-8 text-[#4a4a4a]">
            Our story begins with a simple feeling: beautiful cultural objects
            should not stay hidden on a quiet museum shelf.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-5 py-20 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <p className="section-kicker">Our Story</p>
          <div className="mt-6 h-3 w-28 bg-[#f9d95f]" />
          <div className="mt-3 h-3 w-20 bg-[#65c6c4]" />
          <div className="mt-3 h-3 w-14 bg-[#f27a5e]" />
        </aside>

        <article className="max-w-3xl">
          {storyParagraphs.map((paragraph, index) => (
            <p
              className={
                index === 3 || index === 7
                  ? "mt-10 text-3xl font-black leading-tight text-[#171717]"
                  : "mt-6 text-xl leading-9 text-[#3f3f3f]"
              }
              key={paragraph}
            >
              {paragraph}
            </p>
          ))}
          <p className="mt-12 border-t border-black/10 pt-8 text-xl font-black">
            The Little Treasures From China Team
          </p>
        </article>
      </section>
    </main>
  );
}
