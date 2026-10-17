"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/decor";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Home", hash: "top" },
  { label: "About", hash: "about" },
  { label: "Products", hash: "products" },
  { label: "Our Team", hash: "team" },
  { label: "Contact", hash: "contact" },
];

export function Header({ logoText, logoUrl }: { logoText: string; logoUrl: string | null }) {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("top");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!onHome) return;
    const sections = NAV.map((n) => document.getElementById(n.hash)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: [0, 0.25, 0.5] },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [onHome]);

  useEffect(() => setOpen(false), [pathname]);

  const currentKey = onHome ? active : pathname.startsWith("/products") ? "products" : pathname.startsWith("/about") ? "about" : "";
  const href = (hash: string) => (onHome ? `#${hash}` : hash === "top" ? "/" : `/#${hash}`);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-300",
        scrolled || open
          ? "bg-white/90 shadow-[0_8px_30px_-18px_rgb(12_40_23/0.45)] backdrop-blur-md"
          : "bg-gradient-to-b from-white/70 via-white/35 to-transparent",
      )}
    >
      <div className="mx-auto flex h-[76px] max-w-[1240px] items-center justify-between gap-6 px-5 md:h-[84px] md:px-8">
        <Link href="/" aria-label={`${logoText} home`} className="shrink-0 text-[1.8rem] md:text-[2.15rem]">
          <Logo text={logoText} imageUrl={logoUrl} />
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-10">
            {NAV.map((n) => {
              const isActive = currentKey === n.hash;
              return (
                <li key={n.hash}>
                  <a
                    href={href(n.hash)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "relative py-2 text-[16px] font-semibold transition-colors",
                      isActive ? "text-forest-800" : "text-ink-900/85 hover:text-forest-700",
                    )}
                  >
                    {n.label}
                    <span
                      className={cn(
                        "absolute -bottom-1 left-1/2 h-[3px] -translate-x-1/2 rounded-full bg-gradient-to-r from-leaf-500 to-forest-600 transition-all duration-300",
                        isActive ? "w-full" : "w-0",
                      )}
                    />
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <a
            href={href("contact")}
            className="btn-forest hidden items-center gap-2.5 rounded-full px-8 py-[15px] text-[16px] font-bold sm:inline-flex"
          >
            Get in Touch <ArrowRight className="size-4" strokeWidth={2.5} />
          </a>
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-full bg-white/80 text-forest-900 shadow-card lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <div id="mobile-nav" hidden={!open} className="border-t border-forest-900/10 bg-white/95 px-5 pb-6 pt-2 lg:hidden">
        <ul className="flex flex-col">
          {NAV.map((n) => (
            <li key={n.hash}>
              <a
                href={href(n.hash)}
                onClick={() => setOpen(false)}
                className={cn(
                  "block rounded-xl px-3 py-3 text-base font-semibold",
                  currentKey === n.hash ? "bg-mint-50 text-forest-800" : "text-ink-900",
                )}
              >
                {n.label}
              </a>
            </li>
          ))}
        </ul>
        <a href={href("contact")} onClick={() => setOpen(false)} className="btn-forest mt-3 flex items-center justify-center gap-2 rounded-full px-6 py-3.5 font-bold sm:hidden">
          Get in Touch <ArrowRight className="size-4" />
        </a>
      </div>
    </header>
  );
}
