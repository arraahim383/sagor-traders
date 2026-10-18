import Image from "next/image";
import Link from "next/link";
import { Leaf } from "@/components/decor";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

// Soft backdrops that echo the design's card tints; picked by position so neighbours differ.
const TINTS = [
  "from-[#eef7dc] via-[#f6fbec] to-[#dcefc0]",
  "from-[#e6f1fa] via-[#f3f8fc] to-[#d7e9f5]",
  "from-[#e8f0f8] via-[#f6f9fc] to-[#dfe9f3]",
  "from-[#f2f7ea] via-[#fbfdf7] to-[#e4f0d4]",
  "from-[#fbf4d9] via-[#fdfaf0] to-[#f0e6b8]",
];

export function ProductCard({ product, index = 0, className }: { product: Product; index?: number; className?: string }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-[18px] bg-white shadow-card ring-1 ring-forest-900/5 transition-transform duration-300 hover:-translate-y-1",
        className,
      )}
    >
      <div className={cn("relative aspect-[225/300] overflow-hidden bg-gradient-to-b", TINTS[index % TINTS.length])}>
        <Leaf variant="slim" tone="fresh" rotate={-62} className="-left-6 bottom-2 w-28 opacity-90" />
        <Leaf variant="broad" tone="deep" rotate={-118} className="-right-7 bottom-3 w-28 opacity-90" />
        <Leaf variant="slim" tone="pale" rotate={-100} blur={0.6} className="left-[30%] bottom-[-10px] w-24 opacity-80" />
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(min-width:1280px) 230px, (min-width:640px) 30vw, 60vw"
            className="z-10 object-contain object-bottom px-[7%] pb-[3%] pt-[5%] drop-shadow-[0_14px_14px_rgb(12_40_23/0.18)] transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <span className="absolute inset-0 z-10 flex items-center justify-center text-sm font-semibold text-forest-700/60">Photo coming soon</span>
        )}
        {!product.in_stock && (
          <span className="absolute left-3 top-3 z-20 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-ink-600">Out of stock</span>
        )}
      </div>
      <div className="flex min-h-[64px] items-center justify-center px-3 py-3 text-center">
        <h3 className="text-[16px] font-bold leading-snug text-ink-900 group-hover:text-forest-700">{product.name}</h3>
      </div>
    </Link>
  );
}
