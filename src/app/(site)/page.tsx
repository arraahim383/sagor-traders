import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Hero } from "@/components/site/Hero";
import { About } from "@/components/site/About";
import { ProductCard } from "@/components/site/ProductCard";
import { ProductCarousel } from "@/components/site/ProductCarousel";
import { TeamGrid } from "@/components/site/TeamGrid";
import { Contact } from "@/components/site/Contact";
import { OffersStrip } from "@/components/site/OffersStrip";
import { CenteredEyebrow, Leaf } from "@/components/decor";
import { getBrands, getLiveOffers, getProducts, getSettings, getTeam } from "@/lib/data";

export const revalidate = 300;

export default async function HomePage() {
  const [settings, brands, products, team, offers] = await Promise.all([getSettings(), getBrands(), getProducts(), getTeam(), getLiveOffers()]);
  const featured = products.filter((p) => p.is_featured);
  const shown = featured.length ? featured : products;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WholesaleStore",
    name: settings.company_name,
    description: settings.seo_description,
    telephone: settings.phone,
    email: settings.email,
    address: { "@type": "PostalAddress", addressLocality: "Ullapara", addressRegion: "Sirajganj", addressCountry: "BD" },
    foundingDate: settings.founded_year ? String(settings.founded_year) : undefined,
    brand: brands.map((b) => ({ "@type": "Brand", name: b.name })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Hero settings={settings} brands={brands} />
      <About settings={settings} />

      <section id="products" className="relative overflow-hidden bg-gradient-to-b from-cream-50 via-[#f4f6ec] to-cream-50 pb-10 pt-12 lg:pb-12 lg:pt-14">
        <Leaf variant="broad" tone="pale" rotate={150} blur={2} className="-left-10 top-24 w-40 opacity-70" />
        <div className="mx-auto max-w-[1240px] px-5 md:px-8">
          <CenteredEyebrow>{settings.products_eyebrow}</CenteredEyebrow>
          <OffersStrip offers={offers} />
          <div className="mt-12">
            <ProductCarousel count={shown.length}>
              {shown.map((p, i) => (
                <div key={p.id} data-card className="w-[62vw] shrink-0 snap-start sm:w-[calc((100%-48px)/3)] lg:w-[calc((100%-96px)/5)]">
                  <ProductCard product={p} index={i} className="h-full" />
                </div>
              ))}
            </ProductCarousel>
          </div>
          <div className="mt-2 flex justify-center">
            <Link href="/products" className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-forest-700 transition hover:bg-mint-50">
              View all products <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section id="team" className="relative overflow-hidden bg-gradient-to-b from-cream-50 to-[#eef3e3] pb-16 pt-10 lg:pb-20">
        <Leaf variant="broad" tone="pale" rotate={-30} blur={3} className="-left-12 top-20 w-48 opacity-70" />
        <Leaf variant="slim" tone="pale" rotate={-120} blur={2.5} className="-right-10 top-10 w-44 opacity-70" />
        <Leaf variant="broad" tone="pale" rotate={-80} blur={3} className="-right-16 bottom-40 w-48 opacity-60" />
        <div className="mx-auto max-w-[1340px] px-5 md:px-8">
          <CenteredEyebrow>{settings.team_eyebrow}</CenteredEyebrow>
          <div className="mt-12">
            <TeamGrid members={team} />
          </div>
        </div>
      </section>

      <Contact settings={settings} />
    </>
  );
}
