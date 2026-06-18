import type { Metadata } from "next";
import {
  ChevronRight,
  Heart,
  Mail,
  Minus,
  PackageCheck,
  Plus,
  Share2,
  ShoppingBag,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { heroImageUrl } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Order Inquiry | Little Treasures From China",
  description:
    "Request a catalog or start an order inquiry for curated Chinese museum gifts and cultural objects.",
};

const relatedItems = [
  {
    name: "Dunhuang Color Study Notebook",
    price: "$18 estimate",
    color: "bg-[#65c6c4]",
  },
  {
    name: "Sanxingdui Bronze Mask Pin",
    price: "$14 estimate",
    color: "bg-[#f27a5e]",
  },
  {
    name: "Forbidden City Bookmark Set",
    price: "$22 estimate",
    color: "bg-[#f9d95f]",
  },
  {
    name: "Chinese Characters Learning Cards",
    price: "$16 estimate",
    color: "bg-[#88a8f6]",
  },
];

const productDetails = [
  "Curated starter assortment for first catalog conversations",
  "Museum-inspired gifts, paper goods, keepsakes, and educational objects",
  "Designed for individual gifting, classrooms, museum shops, and cultural programs",
  "Final pricing depends on product selection, quantity, and shipping destination",
];

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#fffdf8] text-[#171717]">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-5 py-8">
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#666]">
          <a className="hover:text-[#2c6f6d]" href="/">
            Home
          </a>
          <ChevronRight size={15} />
          <span>Order Inquiry</span>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 lg:grid-cols-[1.08fr_0.92fr]">
        <div>
          <div className="relative min-h-[540px] overflow-hidden bg-[#f1eee7]">
            <img
              alt="Curated Chinese museum gifts including bookmarks, pins, ceramics, stationery, and gift boxes"
              className="h-full min-h-[540px] w-full object-cover"
              src={heroImageUrl}
            />
            <div className="absolute left-5 top-5 rounded-full bg-white px-4 py-2 text-sm font-black">
              Catalog Preview
            </div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-3">
            {relatedItems.map((item) => (
              <div className="border border-black/10 bg-white p-3" key={item.name}>
                <div className={`h-20 ${item.color}`} />
                <p className="mt-3 text-xs font-black leading-tight">{item.name}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="section-kicker">Order Inquiry</p>
              <h1 className="mt-4 text-3xl font-black leading-tight">
                Little Treasures From China Starter Catalog
              </h1>
            </div>
            <button
              aria-label="Share order inquiry"
              className="grid size-10 place-items-center border border-black/10 bg-white"
              type="button"
            >
              <Share2 size={19} />
            </button>
          </div>

          <div className="mt-7 border-y border-black/10 py-5">
            <dl className="grid gap-4 text-sm">
              <div className="grid grid-cols-[150px_1fr] gap-4">
                <dt className="text-[#555]">Estimated Price</dt>
                <dd className="font-black">$12 - $45 per item</dd>
              </div>
              <div className="grid grid-cols-[150px_1fr] gap-4">
                <dt className="text-[#555]">Shipping</dt>
                <dd>International shipping quoted separately</dd>
              </div>
              <div className="grid grid-cols-[150px_1fr] gap-4">
                <dt className="text-[#555]">Origin</dt>
                <dd>China</dd>
              </div>
              <div className="grid grid-cols-[150px_1fr] gap-4">
                <dt className="text-[#555]">Order Type</dt>
                <dd>Catalog request / curated quote</dd>
              </div>
            </dl>
          </div>

          <div className="mt-5 bg-[#f6f2ea] p-5">
            <p className="font-black">Select an inquiry focus</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["Museum shop", "Classroom", "Personal gifts", "Institution"].map(
                (option) => (
                  <button
                    className="border border-black/15 bg-white px-3 py-2 text-sm font-bold transition hover:border-[#2c6f6d] hover:text-[#2c6f6d]"
                    key={option}
                    type="button"
                  >
                    {option}
                  </button>
                ),
              )}
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-black/10 pt-5">
              <span className="text-sm font-bold text-[#555]">Estimated quantity</span>
              <div className="flex items-center border border-black/15 bg-white">
                <button className="grid size-10 place-items-center" type="button">
                  <Minus size={15} />
                </button>
                <span className="grid h-10 w-14 place-items-center border-x border-black/10 text-sm font-black">
                  24
                </span>
                <button className="grid size-10 place-items-center" type="button">
                  <Plus size={15} />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 border border-black/10 bg-white p-5">
            <div className="flex items-end justify-between gap-5">
              <span className="text-sm font-bold text-[#555]">Quote subtotal</span>
              <span className="text-3xl font-black">TBD</span>
            </div>
            <p className="mt-2 text-right text-xs font-bold text-[#888]">
              Final quote after product selection and shipping review
            </p>
          </div>

          <div className="mt-5 grid gap-2">
            <a
              className="inline-flex items-center justify-center gap-2 bg-[#2f4650] px-6 py-4 text-base font-black text-white transition hover:bg-[#171717]"
              href="mailto:hello@auctuslab.com?subject=Little%20Treasures%20From%20China%20Order%20Inquiry"
            >
              Request Quote <Mail size={18} />
            </a>
            <div className="grid gap-2 sm:grid-cols-2">
              <a
                className="inline-flex items-center justify-center gap-2 border border-black/15 bg-white px-5 py-4 text-sm font-black transition hover:border-[#2c6f6d] hover:text-[#2c6f6d]"
                href="mailto:hello@auctuslab.com?subject=Add%20Little%20Treasures%20Catalog%20to%20Inquiry"
              >
                Add to Inquiry <ShoppingBag size={17} />
              </a>
              <button
                className="inline-flex items-center justify-center gap-2 border border-black/15 bg-white px-5 py-4 text-sm font-black transition hover:border-[#2c6f6d] hover:text-[#2c6f6d]"
                type="button"
              >
                Save for Later <Heart size={17} />
              </button>
            </div>
          </div>

          <div className="mt-6 divide-y divide-black/10 border-y border-black/10 text-sm font-bold">
            {["Shipping / Payment", "Returns & Exchanges", "Catalog Notes"].map(
              (row) => (
                <div className="flex items-center justify-between py-4" key={row}>
                  <span>{row}</span>
                  <Plus size={17} />
                </div>
              ),
            )}
          </div>
        </aside>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12">
        <div className="border-b border-black/10 pb-4">
          <h2 className="text-xl font-black">Related Treasures</h2>
          <p className="mt-1 text-sm text-[#777]">
            Museum-inspired products that can be included in a starter quote.
          </p>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {relatedItems.map((item) => (
            <article className="bg-white" key={item.name}>
              <div className={`aspect-square ${item.color}`} />
              <h3 className="mt-4 text-center text-base font-bold leading-tight">
                {item.name}
              </h3>
              <p className="mt-2 text-center text-sm">{item.price}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="grid border-b border-black/10 text-center text-sm font-bold sm:grid-cols-3">
          <div className="border-b-2 border-[#171717] py-4">Product Details</div>
          <div className="py-4 text-[#777]">Reviews (0)</div>
          <div className="py-4 text-[#777]">Q&amp;A (0)</div>
        </div>
        <div className="grid gap-5 py-8 md:grid-cols-2">
          {productDetails.map((detail) => (
            <div className="flex gap-3 border border-black/10 bg-white p-5" key={detail}>
              <PackageCheck className="shrink-0 text-[#2c6f6d]" size={22} />
              <p className="text-base font-bold leading-7">{detail}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
