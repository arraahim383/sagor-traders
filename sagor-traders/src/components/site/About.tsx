import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Award, MapPin, Package, Store, Truck, Users } from "lucide-react";
import { Leaf } from "@/components/decor";
import type { SiteSettings, Stat } from "@/lib/types";

const ICONS: Record<Stat["icon"], typeof Truck> = { truck: Truck, users: Users, "map-pin": MapPin, store: Store, award: Award, package: Package };

// Organic frame used for uploaded photos; the bundled default already carries this shape.
const BLOB =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 76' preserveAspectRatio='none'%3E%3Cpath d='M9 4 C 30 1, 70 0, 88 1 C 96 1.5, 99 6, 99.5 14 L 100 58 C 100 66, 94 70, 86 71 C 66 74, 30 76, 10 74 C 3 73, 0.5 69, 0.5 62 L 0 16 C 0 8, 3 4.5, 9 4 Z'/%3E%3C/svg%3E\")";

export function About({ settings }: { settings: SiteSettings }) {
  const img = settings.about_image_url || "/media/site/about.webp";
  const bundled = img.startsWith("/media/site/");
  const [first, ...rest] = (settings.about_title || settings.company_name).split(" ");
  const stats = settings.stats?.length ? settings.stats : [];
  return (
    <section id="about" className="relative overflow-hidden bg-cream-50 pb-14 pt-10 lg:pb-8 lg:pt-4">
      <div className="mx-auto grid max-w-[1240px] items-center gap-14 px-5 md:px-8 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:gap-6">
        <div>
          <p className="eyebrow text-leaf-600">{settings.about_eyebrow}</p>
          <h2 className="mt-4 text-[clamp(2.6rem,5.3vw,4.8rem)] font-extrabold leading-[1.06] tracking-[-0.025em] text-forest-900">
            {first} {rest.slice(0, -1).join(" ")}
            {rest.length > 0 && (
              <>
                <br className="hidden sm:block" /> {rest.at(-1)}
              </>
            )}
          </h2>

          {stats.length > 0 && (
            <ul className="mt-10 grid max-w-[560px] grid-cols-3 gap-3 sm:gap-5">
              {stats.map((s, i) => {
                const Icon = ICONS[s.icon] ?? Truck;
                return (
                  <li key={i} className="flex flex-col items-center rounded-[20px] bg-white px-2 py-5 text-center shadow-card ring-1 ring-forest-900/5 sm:px-3 sm:pb-6 sm:pt-5">
                    <span className="flex size-16 items-center justify-center rounded-full bg-lime-100 text-forest-950 shadow-[0_0_0_7px_rgb(233_244_207/0.55)] sm:size-[82px]">
                      <Icon className="size-8 sm:size-[44px]" strokeWidth={1.4} fill="currentColor" stroke="currentColor" />
                    </span>
                    {s.value && <span className="mt-3.5 text-[22px] font-extrabold leading-none text-ink-900 sm:text-[30px]">{s.value}</span>}
                    <span className={`${s.value ? "mt-1" : "mt-4"} text-[13px] font-bold leading-snug text-ink-900 sm:text-[16px]`}>{s.label}</span>
                  </li>
                );
              })}
            </ul>
          )}

          <Link href="/about" className="btn-forest mt-11 inline-flex items-center gap-3 rounded-full px-12 py-[19px] text-[17px] font-bold">
            Learn More <ArrowRight className="size-[18px]" strokeWidth={2.5} />
          </Link>
        </div>

        <div className="relative lg:mr-[calc(min(0px,(1240px-100vw)/2)-32px)]">
          <Leaf variant="slim" tone="fresh" rotate={28} blur={1.5} className="-left-14 top-[20%] z-10 hidden w-36 lg:block" sway />
          <div className="relative aspect-[1200/865] w-full" style={bundled ? undefined : { maskImage: BLOB, WebkitMaskImage: BLOB, maskSize: "100% 100%", WebkitMaskSize: "100% 100%" }}>
            <Image src={img} alt={`${settings.company_name} warehouse`} fill sizes="(min-width:1024px) 52vw, 92vw" className={bundled ? "object-contain" : "object-cover"} />
          </div>
          {!bundled && (
            <>
              <Leaf variant="broad" tone="deep" rotate={-50} className="-right-6 bottom-8 w-40" />
              <Leaf variant="slim" tone="fresh" rotate={-80} className="-right-2 bottom-24 w-32" />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
