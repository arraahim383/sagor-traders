"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Horizontal scroll-snap carousel with arrow buttons; swipe works natively on touch. */
export function ProductCarousel({ children, count }: { children: React.ReactNode; count: number }) {
  const track = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  }, []);

  useEffect(() => {
    update();
    const el = track.current;
    el?.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const go = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    // wrap around at either end so the arrows always do something
    if (dir === 1 && edge.end) return el.scrollTo({ left: 0, behavior: "smooth" });
    if (dir === -1 && edge.start) return el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
    const card = el.querySelector<HTMLElement>("[data-card]");
    const step = card ? card.offsetWidth + 24 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  const btn =
    "absolute top-[42%] z-20 hidden size-14 -translate-y-1/2 items-center justify-center rounded-full bg-white text-ink-900 shadow-[0_10px_30px_-10px_rgb(12_40_23/0.45)] transition hover:bg-forest-800 hover:text-white md:flex xl:size-[62px]";

  return (
    <div className="relative">
      <button type="button" aria-label="Previous products" className={cn(btn, "left-0 xl:-left-[86px]")} onClick={() => go(-1)}>
        <ArrowLeft className="size-6" strokeWidth={2.5} />
      </button>
      <div
        ref={track}
        className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-5 pb-6 pt-2 md:mx-0 md:px-1"
        aria-label={`${count} featured products`}
      >
        {children}
      </div>
      <button type="button" aria-label="Next products" className={cn(btn, "right-0 xl:-right-[86px]")} onClick={() => go(1)}>
        <ArrowRight className="size-6" strokeWidth={2.5} />
      </button>
    </div>
  );
}
