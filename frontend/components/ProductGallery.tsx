"use client";

import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const cleanImages = images.filter(Boolean);
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const touchStart = useRef<number | null>(null);
  const count = cleanImages.length;
  const go = useCallback((next: number) => setIndex((next + count) % count), [count]);

  useEffect(() => {
    if (!count) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") go(index - 1);
      if (event.key === "ArrowRight") go(index + 1);
      if (event.key === "Escape") setLightbox(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [count, go, index]);

  if (!count) return <div className="grid aspect-[4/5] place-items-center bg-white text-sm text-[#777]">No image available</div>;

  const image = cleanImages[index];
  const swipeEnd = (clientX: number) => {
    if (touchStart.current == null) return;
    const delta = clientX - touchStart.current;
    if (Math.abs(delta) > 45) go(index + (delta < 0 ? 1 : -1));
    touchStart.current = null;
  };

  return <>
    <div className="relative overflow-hidden bg-white" onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }} onTouchEnd={(event) => swipeEnd(event.changedTouches[0].clientX)}>
      <button aria-label="Open fullscreen image" className="grid aspect-[4/5] max-h-[720px] w-full place-items-center" onClick={() => setLightbox(true)} type="button">
        <img alt={`${alt} ${index + 1}`} className="h-full w-full object-contain p-3" src={image} />
      </button>
      {count > 1 ? <>
        <button aria-label="Previous image" className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center bg-white/95 shadow-sm" onClick={() => go(index - 1)} type="button"><ChevronLeft size={20} /></button>
        <button aria-label="Next image" className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center bg-white/95 shadow-sm" onClick={() => go(index + 1)} type="button"><ChevronRight size={20} /></button>
      </> : null}
      <span className="absolute bottom-3 left-3 bg-[#171717]/85 px-2.5 py-1 text-xs font-bold text-white">{index + 1} / {count}</span>
      <span className="absolute bottom-3 right-3 grid size-8 place-items-center bg-white/90"><Expand size={15} /></span>
    </div>
    {count > 1 ? <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{cleanImages.map((src, imageIndex) => <button aria-label={`View image ${imageIndex + 1}`} className={`relative aspect-[4/5] w-[68px] shrink-0 overflow-hidden border-2 bg-white ${imageIndex === index ? "border-[#171717]" : "border-transparent"}`} key={`${src}-${imageIndex}`} onClick={() => setIndex(imageIndex)} type="button"><img alt="" className="h-full w-full object-contain p-1" loading="lazy" src={src} /></button>)}</div> : null}
    {lightbox ? <div aria-modal="true" className="fixed inset-0 z-[80] grid place-items-center bg-black/95 p-4" role="dialog" onClick={() => setLightbox(false)}>
      <button aria-label="Close fullscreen image" className="absolute right-4 top-4 grid size-11 place-items-center bg-white text-black" onClick={() => setLightbox(false)} type="button"><X size={22} /></button>
      {count > 1 ? <><button aria-label="Previous image" className="absolute left-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center bg-white text-black sm:left-6" onClick={(event) => { event.stopPropagation(); go(index - 1); }} type="button"><ChevronLeft /></button><button aria-label="Next image" className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center bg-white text-black sm:right-6" onClick={(event) => { event.stopPropagation(); go(index + 1); }} type="button"><ChevronRight /></button></> : null}
      <img alt={`${alt} ${index + 1}`} className="max-h-[90vh] max-w-[92vw] object-contain" onClick={(event) => event.stopPropagation()} src={image} />
    </div> : null}
  </>;
}
