import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, MessageCircle, Phone, XCircle } from "lucide-react";
import { Leaf } from "@/components/decor";
import { Markdown } from "@/components/Markdown";
import { InquiryForm } from "@/components/site/InquiryForm";
import { ProductCard } from "@/components/site/ProductCard";
import { getBrands, getProduct, getProducts, getSettings } from "@/lib/data";
import { formatPhone, telHref, whatsappNumber } from "@/lib/utils";

export const revalidate = 300;

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return { title: "Product not found" };
  return {
    title: p.name,
    description: p.summary ?? `${p.name} from ${p.brand?.name ?? "Marico"}, supplied by M/S Sagor Traders.`,
    openGraph: { images: p.image_url ? [{ url: p.image_url }] : undefined },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [product, settings, all, brands] = await Promise.all([getProduct(slug), getSettings(), getProducts(), getBrands()]);
  if (!product) notFound();
  const brand = brands.find((b) => b.id === product.brand_id);
  const related = all
    .filter((p) => p.id !== product.id && (p.brand_id === product.brand_id || p.category_id === product.category_id))
    .slice(0, 5);
  const wa = whatsappNumber(settings.whatsapp || settings.phone);
  const waText = encodeURIComponent(`Assalamu alaikum, I'd like to order ${product.name}. Shop name: `);

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-[#e3eef3] via-[#eef4e6] to-cream-50 pb-16 pt-28 lg:pt-36">
        <Leaf variant="broad" tone="fresh" rotate={-30} blur={1} className="-left-8 top-24 w-40" />
        <div className="mx-auto max-w-[1240px] px-5 md:px-8">
          <nav aria-label="Breadcrumb" className="mb-8 text-sm font-semibold text-ink-600">
            <Link href="/" className="hover:text-forest-700">Home</Link> <span className="mx-1.5 text-ink-400">/</span>
            <Link href="/products" className="hover:text-forest-700">Products</Link> <span className="mx-1.5 text-ink-400">/</span>
            <span className="text-forest-800">{product.name}</span>
          </nav>

          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
            <div className="relative mx-auto aspect-[4/5] w-full max-w-[460px] overflow-hidden rounded-[28px] bg-gradient-to-b from-[#eef7dc] via-[#f8fbf0] to-[#dcefc0] shadow-card">
              <Leaf variant="slim" tone="fresh" rotate={-62} className="-left-8 bottom-4 w-44" />
              <Leaf variant="broad" tone="deep" rotate={-118} className="-right-10 bottom-6 w-44" />
              {product.image_url && (
                <Image src={product.image_url} alt={product.name} fill priority sizes="(min-width:1024px) 460px, 92vw" className="z-10 object-contain object-bottom px-[12%] pb-[6%] pt-[8%] drop-shadow-[0_20px_20px_rgb(12_40_23/0.2)]" />
              )}
            </div>

            <div>
              {brand && (
                <Link href={`/products?brand=${brand.slug}`} className="inline-flex items-center gap-2.5 rounded-full bg-white py-1.5 pl-1.5 pr-4 text-sm font-bold text-ink-900 shadow-card">
                  {brand.logo_url && (
                    <span className="relative size-8 overflow-hidden rounded-full">
                      <Image src={brand.logo_url} alt="" fill sizes="32px" className="object-cover" />
                    </span>
                  )}
                  {brand.name}
                </Link>
              )}
              <h1 className="mt-5 text-[clamp(2.2rem,4.6vw,3.6rem)] font-extrabold leading-[1.06] tracking-[-0.025em] text-forest-900">{product.name}</h1>
              {product.category && <p className="mt-2 text-sm font-bold uppercase tracking-[0.2em] text-leaf-600">{product.category.name}</p>}
              {product.summary && <p className="mt-5 text-lg leading-relaxed text-ink-600">{product.summary}</p>}

              <dl className="mt-6 grid grid-cols-2 gap-3 sm:max-w-md">
                <div className="rounded-2xl bg-white p-4 shadow-card">
                  <dt className="text-xs font-bold uppercase tracking-[0.15em] text-ink-400">Availability</dt>
                  <dd className="mt-1 flex items-center gap-1.5 font-bold text-ink-900">
                    {product.in_stock ? <CheckCircle2 className="size-4 text-leaf-600" /> : <XCircle className="size-4 text-red-500" />}
                    {product.in_stock ? "In stock" : "Out of stock"}
                  </dd>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-card">
                  <dt className="text-xs font-bold uppercase tracking-[0.15em] text-ink-400">{product.price != null ? "MRP" : "Pack sizes"}</dt>
                  <dd className="mt-1 font-bold text-ink-900">
                    {product.price != null ? `৳${Number(product.price).toLocaleString("en-BD")}` : product.pack_sizes || "Ask for sizes"}
                  </dd>
                </div>
                {product.price != null && product.pack_sizes && (
                  <div className="col-span-2 rounded-2xl bg-white p-4 shadow-card">
                    <dt className="text-xs font-bold uppercase tracking-[0.15em] text-ink-400">Pack sizes</dt>
                    <dd className="mt-1 font-bold text-ink-900">{product.pack_sizes}</dd>
                  </div>
                )}
              </dl>

              <Markdown text={product.description} className="mt-4 max-w-xl text-[16px] leading-relaxed text-ink-600" />

              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#request" className="btn-forest inline-flex items-center gap-2 rounded-full px-7 py-4 font-bold">
                  Request this product
                </a>
                {wa && (
                  <a href={`https://wa.me/${wa}?text=${waText}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#25d366] px-6 py-4 font-bold text-white transition hover:brightness-105">
                    <MessageCircle className="size-5" /> WhatsApp
                  </a>
                )}
                {settings.phone && (
                  <a href={telHref(settings.phone)} className="inline-flex items-center gap-2 rounded-full border-2 border-forest-800 px-6 py-[14px] font-bold text-forest-800 transition hover:bg-forest-800 hover:text-white">
                    <Phone className="size-5" /> {formatPhone(settings.phone)}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="request" className="scroll-mt-24 bg-cream-50 py-16">
        <div className="mx-auto max-w-3xl px-5 md:px-8">
          <div className="rounded-[28px] bg-white p-6 shadow-card sm:p-10">
            <p className="eyebrow text-leaf-600">Retailer request</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.02em] text-forest-900">Order {product.name}</h2>
            <p className="mb-7 mt-2 text-ink-600">Leave your shop details and our sales representative will call to confirm price and delivery.</p>
            <InquiryForm variant="product" productId={product.id} productName={product.name} />
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="bg-cream-50 pb-24">
          <div className="mx-auto max-w-[1240px] px-5 md:px-8">
            <h2 className="mb-6 text-2xl font-extrabold text-forest-900">You may also stock</h2>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-5">
              {related.map((p, i) => (
                <li key={p.id}>
                  <ProductCard product={p} index={i + 1} className="h-full" />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
