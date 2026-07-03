"use client";

import { Heart, Share2 } from "lucide-react";
import { useState } from "react";

export function ProductUtilityActions({ title }: { title: string }) {
  const [saved, setSaved] = useState(false);
  async function share() {
    if (navigator.share) await navigator.share({ title, url: window.location.href });
    else await navigator.clipboard.writeText(window.location.href);
  }
  return <div className="flex gap-2"><button aria-label="Share product" className="grid size-10 place-items-center border border-black/15 bg-white" type="button" onClick={share}><Share2 size={17} /></button><button aria-label={saved ? "Remove from favorites" : "Add to favorites"} className={`grid size-10 place-items-center border border-black/15 ${saved ? "bg-[#171717] text-white" : "bg-white"}`} type="button" onClick={() => setSaved((value) => !value)}><Heart fill={saved ? "currentColor" : "none"} size={17} /></button></div>;
}
