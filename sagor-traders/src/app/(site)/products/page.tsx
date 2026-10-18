import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { PageHeader } from "@/components/site/PageHeader";
import { ProductCard } from "@/components/site/ProductCard";
import { getBrands, getCategories, getProducts } from "@/lib/data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Products",
  description: "Browse the Marico products M/S Sagor Traders supplies to retailers in Ullapara, Sirajganj, and request stock in one tap.",
};

type Search = Promise<{ brand?: string; category?: string; q?: string }>;

export default async function ProductsPage({ searchParams }: { searchParams: Search }) {
  const { brand, category, q } = await searchParams;
  const [products, brands, categories] = await Promise.all([getProducts(), getBrands(), getCategories()]);
  const term = q?.trim().toLowerCase() ?? "";
  const list = products.filter(
    (p) =>
      (!brand || p.brand?.slug === brand) &&
      (!category || p.category?.slug === category) &&
      (!term || [p.name, p.summary, p.brand?.name, p.category?.name].some((v) => v?.toLowerCase().includes(term))),
  );
  const usedBrands = brands.filter((b) => !b.is_parent && products.some((p) => p.brand_id === b.id));
  const usedCats = categories.filter((c) => products.some((p) => p.category_id === c.id));
  const activeBrand = brands.find((b) => b.slug === brand);

  const link = (next: { brand?: string | null; category?: string | null }) => {
    const sp = new URLSearchParams();
    const b = next.brand === undefined ? brand : next.brand;
    const c = next.category === undefined ? category : next.category;
    if (b) sp.set("brand", b);
    if (c) sp.set("category", c);
    if (q) sp.set("q", q);
    const s = sp.toString();
    return s ? `/products?${s}` : "/products";
  };

  const chip = (active: boolean) =>
    cn(
      "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition",
      active ? "border-forest-800 bg-forest-800 text-white" : "border-forest-900/10 bg-white text-ink-900 hover:border-leaf-500",
    );

  return (
    <>
      <PageHeader
        eyebrow="Our Products"
        title={activeBrand && !activeBrand.is_parent ? `${activeBrand.name} products` : "Everything we deliver"}
        intro="Genuine Marico products, delivered to shops across Ullapara and nearby markets. Tap any product to request stock."
        crumbs={[{ label: "Home", href: "/" }, { label: "Products" }]}
      />

      <section className="mx-auto max-w-[1240px] px-5 pb-24 md:px-8">
        <form action="/products" className="relative -mt-6 mb-8 max-w-xl">
          {brand && <input type="hidden" name="brand" value={brand} />}
          {category && <input type="hidden" name="category" value={category} />}
          <Search className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-ink-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search products, brands or categories"
            aria-label="Search products"
            className="h-14 w-full rounded-full border border-forest-900/10 bg-white pl-13 pr-32 text-[15px] shadow-card outline-none focus:border-leaf-500 focus:ring-4 focus:ring-leaf-400/20"
          />
          <button type="submit" className="btn-forest absolute right-2 top-2 h-10 rounded-full px-5 text-sm font-bold">
            Search
          </button>
        </form>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-bold uppercase tracking-[0.2em] text-ink-400">Brand</span>
            <Link href={link({ brand: null })} className={chip(!brand || activeBrand?.is_parent === true)}>
              All brands
            </Link>
            {usedBrands.map((b) => (
              <Link key={b.id} href={link({ brand: b.slug })} className={chip(brand === b.slug)}>
                {b.logo_url && (
                  <span className="relative size-6 overflow-hidden rounded-full bg-white">
                    <Image src={b.logo_url} alt="" fill sizes="24px" className="object-cover" />
                  </span>
                )}
                {b.name}
              </Link>
            ))}
          </div>
          {usedCats.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-bold uppercase tracking-[0.2em] text-ink-400">Type</span>
              <Link href={link({ category: null })} className={chip(!category)}>
                All types
              </Link>
              {usedCats.map((c) => (
                <Link key={c.id} href={link({ category: c.slug })} className={chip(category === c.slug)}>
                  {c.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-ink-600">
            {list.length} {list.length === 1 ? "product" : "products"}
            {q ? ` for “${q}”` : ""}
          </p>
          {(brand || category || q) && (
            <Link href="/products" className="inline-flex items-center gap-1 text-sm font-bold text-forest-700 hover:underline">
              <X className="size-4" /> Clear filters
            </Link>
          )}
        </div>

        {list.length ? (
          <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4 xl:grid-cols-5">
            {list.map((p, i) => (
              <li key={p.id}>
                <ProductCard product={p} index={i} className="h-full" />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-8 rounded-3xl border border-dashed border-forest-900/15 bg-white p-12 text-center">
            <p className="text-lg font-bold text-ink-900">No products match yet.</p>
            <p className="mt-2 text-ink-600">
              We may still stock it. <Link href="/#contact" className="font-bold text-forest-700 underline">Ask us directly</Link>.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
