import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgePercent, CalendarClock } from "lucide-react";
import { Leaf } from "@/components/decor";
import type { Offer } from "@/lib/types";
import { cn } from "@/lib/utils";

// Offers run on Bangladesh dates, whatever timezone the server is in.
function todayInDhaka() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());
}

function endsLabel(date: string | null) {
  if (!date) return null;
  const end = new Date(`${date}T00:00:00Z`);
  const days = Math.round((end.getTime() - new Date(`${todayInDhaka()}T00:00:00Z`).getTime()) / 86_400_000);
  const day = end.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  if (days <= 0) return `Last day · ${day}`;
  if (days === 1) return `Ends tomorrow · ${day}`;
  return `${days} days left · ends ${day}`;
}

/** Only renders while at least one offer is live; offers switch on and off by their dates. */
export function OffersStrip({ offers }: { offers: Offer[] }) {
  if (!offers.length) return null;
  const shown = offers.slice(0, 2);
  const single = shown.length === 1;
  return (
    <div className={cn("mx-auto mt-10 grid gap-6", single ? "max-w-[980px]" : "max-w-[1240px] lg:grid-cols-2")}>
      {shown.map((o) => (
        <OfferCard key={o.id} offer={o} wide={single} />
      ))}
    </div>
  );
}

function OfferCard({ offer: o, wide }: { offer: Offer; wide: boolean }) {
  const photo = o.image_url ?? o.product?.image_url ?? null;
  const isProductShot = !o.image_url && !!o.product?.image_url;
  const ends = endsLabel(o.ends_on);
  const href = o.product ? `/products/${o.product.slug}` : "#contact";

  return (
    <article className="group relative isolate flex flex-col gap-5 overflow-hidden rounded-[28px] bg-gradient-to-br from-lime-100 via-cream-50 to-mint-50 p-4 shadow-card ring-1 ring-forest-900/5 sm:flex-row sm:items-center sm:gap-7 sm:p-5">
      <Leaf variant="broad" tone="pale" rotate={-20} blur={1.5} className="-right-10 -top-8 -z-10 w-44 opacity-60" />
      <Leaf variant="slim" tone="pale" rotate={160} blur={2} className="-bottom-10 right-1/4 -z-10 w-40 opacity-50" />

      <div
        className={cn(
          "relative aspect-[16/10] shrink-0 overflow-hidden rounded-[20px] bg-gradient-to-b from-[#eef7dc] via-[#f6fbec] to-[#dcefc0] ring-1 ring-forest-900/5 sm:aspect-square",
          wide ? "sm:w-[220px] lg:w-[240px]" : "sm:w-[170px]",
        )}
      >
        {photo ? (
          <Image
            src={photo}
            alt={o.product?.name ?? o.title}
            fill
            sizes="(min-width:640px) 240px, 90vw"
            className={cn(
              "transition-transform duration-500 group-hover:scale-[1.04]",
              isProductShot ? "object-contain p-[10%] drop-shadow-[0_14px_14px_rgb(12_40_23/0.18)]" : "object-cover",
            )}
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-forest-700">
            <BadgePercent className="size-14" strokeWidth={1.5} />
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-start px-1 pb-2 sm:px-0 sm:py-2 sm:pr-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-200 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-forest-900">
          <BadgePercent className="size-3.5" strokeWidth={2.5} /> Special offer
        </span>
        <h3 className={cn("mt-3 font-extrabold leading-tight text-forest-900", wide ? "text-2xl lg:text-[30px]" : "text-xl lg:text-2xl")}>
          {o.title}
        </h3>
        {o.body && <p className="mt-2 line-clamp-2 text-[15px] leading-relaxed text-ink-600">{o.body}</p>}
        {o.product && (
          <p className="mt-2 text-sm font-semibold text-ink-600">
            On <span className="text-forest-700">{o.product.name}</span>
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link href={href} className="btn-forest inline-flex items-center gap-2 rounded-full px-6 py-3 text-[15px] font-bold">
            {o.product ? "View product" : "Ask about this offer"} <ArrowRight className="size-4" strokeWidth={2.5} />
          </Link>
          {ends && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3.5 py-2 text-[13px] font-semibold text-forest-800 ring-1 ring-forest-900/10">
              <CalendarClock className="size-4 text-leaf-600" /> {ends}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
