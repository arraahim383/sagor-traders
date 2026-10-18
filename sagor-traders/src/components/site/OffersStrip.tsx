import Image from "next/image";
import Link from "next/link";
import { BadgePercent } from "lucide-react";
import type { Offer } from "@/lib/types";

function until(date: string | null) {
  if (!date) return null;
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Only renders while at least one offer is live; offers switch on and off by their dates. */
export function OffersStrip({ offers }: { offers: Offer[] }) {
  if (!offers.length) return null;
  return (
    <div className="mx-auto mb-12 grid max-w-[1240px] gap-4 px-5 md:grid-cols-2 md:px-8">
      {offers.slice(0, 2).map((o) => {
        const inner = (
          <div className="flex h-full items-center gap-4 rounded-2xl bg-gradient-to-r from-forest-900 to-forest-700 p-4 pr-6 text-white shadow-card">
            {o.image_url ? (
              <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-white">
                <Image src={o.image_url} alt="" fill sizes="64px" className="object-cover" />
              </span>
            ) : (
              <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-lime-200 text-forest-900">
                <BadgePercent className="size-7" />
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-lime-200">
                Offer{o.ends_on ? ` · until ${until(o.ends_on)}` : ""}
              </p>
              <p className="truncate text-lg font-bold">{o.title}</p>
              {o.body && <p className="line-clamp-1 text-sm text-white/80">{o.body}</p>}
            </div>
          </div>
        );
        return o.product ? (
          <Link key={o.id} href={`/products/${o.product.slug}`} className="block transition hover:-translate-y-0.5">
            {inner}
          </Link>
        ) : (
          <div key={o.id}>{inner}</div>
        );
      })}
    </div>
  );
}
