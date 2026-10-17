import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Leaf } from "@/components/decor";

export function PageHeader({ eyebrow, title, intro, crumbs }: { eyebrow: string; title: string; intro?: string | null; crumbs: { label: string; href?: string }[] }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#e3eef3] via-[#eef4e6] to-cream-50 pb-14 pt-32 lg:pb-16 lg:pt-40">
      <Leaf variant="broad" tone="fresh" rotate={-30} blur={1} className="-left-8 top-24 w-40 opacity-90" />
      <Leaf variant="slim" tone="deep" rotate={-140} blur={2} className="-right-6 top-28 w-44 opacity-80" />
      <Leaf variant="broad" tone="pale" rotate={160} blur={3} className="bottom-2 right-[22%] hidden w-32 opacity-70 md:block" />
      <div className="relative mx-auto max-w-[1240px] px-5 md:px-8">
        <nav aria-label="Breadcrumb" className="mb-5">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-ink-600">
            {crumbs.map((c, i) => (
              <li key={i} className="flex items-center gap-1.5">
                {c.href ? (
                  <Link href={c.href} className="hover:text-forest-700">
                    {c.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-forest-800">
                    {c.label}
                  </span>
                )}
                {i < crumbs.length - 1 && <ChevronRight className="size-3.5 text-ink-400" />}
              </li>
            ))}
          </ol>
        </nav>
        <p className="eyebrow text-leaf-600">{eyebrow}</p>
        <h1 className="mt-3 max-w-3xl text-[clamp(2.3rem,5vw,4rem)] font-extrabold leading-[1.06] tracking-[-0.025em] text-forest-900">{title}</h1>
        {intro && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-600">{intro}</p>}
      </div>
    </section>
  );
}
