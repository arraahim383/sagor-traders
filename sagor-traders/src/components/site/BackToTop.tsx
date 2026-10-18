"use client";

import { ArrowUp } from "lucide-react";

export function BackToTop() {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      className="absolute bottom-16 right-5 flex size-12 items-center justify-center rounded-full bg-lime-200 text-forest-950 shadow-[0_10px_25px_-10px_rgb(0_0_0/0.5)] transition hover:-translate-y-0.5 hover:bg-leaf-400 md:right-8 lg:bottom-auto lg:top-1/2 lg:size-14 lg:-translate-y-[calc(50%+12px)]"
    >
      <ArrowUp className="size-5" strokeWidth={2.6} />
    </button>
  );
}
