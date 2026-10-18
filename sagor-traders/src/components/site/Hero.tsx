import Image from "next/image";
import Link from "next/link";
import { Leaf, Swoosh } from "@/components/decor";
import type { Brand, SiteSettings } from "@/lib/types";
import { splitHighlight } from "@/lib/utils";

// Bubble positions measured from the design: centre x %, centre y %, diameter as % of the cluster width.
const CENTER_SLOT = [48.8, 24.0, 39.5] as const;
const SLOTS: (readonly [number, number, number])[] = [
  [18.9, 22.9, 15.9],
  [79.4, 16.7, 17.2],
  [19.2, 45.0, 16.6],
  [79.2, 40.3, 17.6],
  [8.5, 64.8, 17.2],
  [33.8, 60.0, 17.6],
  [52.0, 68.2, 16.6],
  [69.8, 60.5, 17.2],
  [91.1, 62.9, 17.6],
  [23.1, 81.4, 17.2],
  [41.4, 88.8, 17.2],
  [62.2, 89.5, 17.2],
  [80.5, 83.4, 17.2],
];

function BrandCloud({ brands }: { brands: Brand[] }) {
  const shown = brands.filter((b) => b.show_in_hero && b.logo_url);
  const parent = shown.find((b) => b.is_parent) ?? shown[0];
  const others = shown.filter((b) => b !== parent).slice(0, SLOTS.length);
  if (!parent) return null;
  return (
    <div className="relative aspect-[785/645] w-full" role="list" aria-label="Brands we distribute">
      <Link
        href={`/products?brand=${parent.slug}`}
        role="listitem"
        aria-label={`${parent.name} products`}
        className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 animate-float rounded-full bg-white p-[1.6%] shadow-bubble transition-transform duration-300 hover:scale-[1.03]"
        style={{ left: `${CENTER_SLOT[0]}%`, top: `${CENTER_SLOT[1]}%`, width: `${CENTER_SLOT[2]}%`, aspectRatio: "1" }}
      >
        <span className="relative block size-full overflow-hidden rounded-full border-[clamp(5px,0.8vw,11px)] border-forest-800 bg-white">
          <Image src={parent.logo_url!} alt={parent.name} fill sizes="(min-width:1024px) 300px, 40vw" className="scale-[0.92] object-contain" priority />
        </span>
      </Link>
      {others.map((b, i) => {
        const [x, y, d] = SLOTS[i];
        return (
          <Link
            key={b.id}
            href={`/products?brand=${b.slug}`}
            role="listitem"
            aria-label={`${b.name} products`}
            title={b.name}
            className="absolute -translate-x-1/2 -translate-y-1/2 animate-float overflow-hidden rounded-full bg-white shadow-bubble ring-1 ring-black/5 transition-[scale] duration-300 hover:scale-110 focus-visible:scale-110"
            style={{ left: `${x}%`, top: `${y}%`, width: `${d}%`, aspectRatio: "1", animationDelay: `${-(i * 0.73) % 7}s` }}
          >
            <Image src={b.logo_url!} alt={b.name} fill sizes="(min-width:1024px) 130px, 18vw" className="object-cover" />
          </Link>
        );
      })}
    </div>
  );
}

/** Admins can force line breaks in the headline with new lines. */
function lines(text: string) {
  return text.split("\n").map((part, i, all) => (
    <span key={i}>
      {part}
      {i < all.length - 1 && <br />}
    </span>
  ));
}

export function Hero({ settings, brands }: { settings: SiteSettings; brands: Brand[] }) {
  const title = settings.hero_title || settings.company_name;
  const { before, mark, after } = splitHighlight(title, settings.hero_highlight);
  return (
    <section id="top" className="relative isolate overflow-hidden bg-[#dfeaf0]">
      <Image
        src={settings.hero_image_url || "/media/site/hero.webp"}
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover object-[84%_100%] md:object-[66%_100%] lg:object-[50%_100%]"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white/50 via-white/10 to-transparent" />
      <Leaf variant="broad" tone="fresh" rotate={-24} blur={1.2} sway className="right-[-2.5%] top-[17%] hidden w-[12vw] max-w-[180px] lg:block" />

      <div className="relative flex flex-col pb-28 pt-32 lg:block lg:h-[max(640px,min(60.9vw,920px))] lg:p-0">
        <div className="mx-auto w-full max-w-[1240px] px-5 md:px-8 lg:absolute lg:inset-x-0 lg:top-[clamp(150px,16.5vw,240px)]">
          <div className="max-w-[620px] lg:max-w-[44vw] xl:max-w-[620px]">
            <p className="eyebrow mb-6 text-forest-900">{settings.hero_eyebrow}</p>
            <h1 className="text-[clamp(2.7rem,10vw,3.6rem)] font-extrabold leading-[1.02] tracking-[-0.03em] text-forest-900 lg:text-[clamp(3.2rem,5.9vw,5.4rem)]">
              {lines(before)}
              {mark && (
                <span className="relative inline-block whitespace-nowrap">
                  {mark}
                  <Swoosh className="absolute -bottom-[0.26em] left-[18%] h-[0.36em] w-[96%]" />
                </span>
              )}
              {lines(after)}
            </h1>
          </div>
        </div>

        <div className="mx-auto mt-10 w-[min(92vw,560px)] lg:absolute lg:bottom-[min(8.1vw,130px)] lg:left-[calc(50%+min(18.6vw,300px))] lg:mt-0 lg:w-[min(48.3vw,760px)] lg:-translate-x-1/2">
          <BrandCloud brands={brands} />
        </div>
      </div>

      <svg viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true" className="absolute inset-x-0 bottom-[-1px] h-[min(9vw,120px)] w-full text-cream-50">
        <path d="M0 18 C 220 70 420 112 640 119 L 0 120 Z" fill="currentColor" />
        <path d="M640 119 C 900 118 1180 112 1440 96 L 1440 120 L 640 120 Z" fill="currentColor" />
      </svg>
    </section>
  );
}
