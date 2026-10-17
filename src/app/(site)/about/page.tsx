import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Award, MapPin, Package, Store, Truck, Users } from "lucide-react";
import { Markdown } from "@/components/Markdown";
import { PageHeader } from "@/components/site/PageHeader";
import { getBrands, getProducts, getSettings, getTeam } from "@/lib/data";
import type { Stat } from "@/lib/types";

export const revalidate = 300;
export const metadata: Metadata = { title: "About us" };

const ICONS: Record<Stat["icon"], typeof Truck> = { truck: Truck, users: Users, "map-pin": MapPin, store: Store, award: Award, package: Package };

export default async function AboutPage() {
  const [s, brands, products, team] = await Promise.all([getSettings(), getBrands(), getProducts(), getTeam()]);
  const year = new Date().getFullYear();
  // Live figures, counted from the database so they never contradict each other.
  const facts = [
    s.founded_year ? { value: `${year - s.founded_year}+`, label: `Years serving since ${s.founded_year}` } : null,
    s.staff_count ? { value: `${s.staff_count}`, label: "People on the team" } : null,
    { value: `${brands.filter((b) => !b.is_parent).length}`, label: "Marico brands carried" },
    { value: `${products.length}`, label: "Products listed online" },
  ].filter(Boolean) as { value: string; label: string }[];

  return (
    <>
      <PageHeader eyebrow={s.about_eyebrow || "About Us"} title={s.about_title || s.company_name} intro={s.about_intro} crumbs={[{ label: "Home", href: "/" }, { label: "About" }]} />

      <section className="mx-auto max-w-[1240px] px-5 pb-10 md:px-8">
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {facts.map((f) => (
            <li key={f.label} className="rounded-3xl bg-white p-6 text-center shadow-card">
              <p className="text-4xl font-extrabold tracking-[-0.02em] text-forest-800">{f.value}</p>
              <p className="mt-1 text-sm font-semibold text-ink-600">{f.label}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto grid max-w-[1240px] gap-12 px-5 pb-24 pt-6 md:px-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Markdown text={s.about_body} className="text-[17px] leading-[1.8] text-ink-600" />
        <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
          <div className="relative aspect-[1200/865]">
            <Image src={s.about_image_url || "/media/site/about.webp"} alt={`${s.company_name} warehouse`} fill sizes="(min-width:1024px) 480px, 92vw" className="object-contain" />
          </div>
          <ul className="grid grid-cols-3 gap-3">
            {s.stats.map((st, i) => {
              const Icon = ICONS[st.icon] ?? Truck;
              return (
                <li key={i} className="flex flex-col items-center rounded-2xl bg-white p-4 text-center shadow-card">
                  <span className="flex size-12 items-center justify-center rounded-full bg-lime-100 text-forest-900">
                    <Icon className="size-6" fill="currentColor" />
                  </span>
                  {st.value && <span className="mt-2 text-lg font-extrabold">{st.value}</span>}
                  <span className="mt-1 text-xs font-bold">{st.label}</span>
                </li>
              );
            })}
          </ul>
          <div className="rounded-3xl bg-forest-900 p-7 text-white">
            <p className="text-xl font-extrabold">Want Sagor Traders to supply your shop?</p>
            <p className="mt-2 text-white/75">Meet the {team.length} people who keep Ullapara&apos;s shelves stocked, or send us a message.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/#contact" className="inline-flex items-center gap-2 rounded-full bg-lime-200 px-5 py-3 font-bold text-forest-950">
                Get in touch <ArrowRight className="size-4" />
              </Link>
              <Link href="/#team" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-3 font-bold">
                Our team
              </Link>
            </div>
          </div>
        </aside>
      </section>
    </>
  );
}
