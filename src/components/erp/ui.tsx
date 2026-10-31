// Shared building blocks for the business screens, in the admin's forest/lime style.
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const fieldCls =
  "w-full rounded-xl border border-ink-900/10 bg-white px-3 py-2 text-sm text-ink-900 outline-none transition focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/20";
export const labelCls = "mb-1 block text-xs font-bold uppercase tracking-wider text-ink-600";
export const cellCls =
  "w-[4.5rem] rounded-lg border border-ink-900/10 bg-white px-1.5 py-1 text-center text-sm tabular-nums outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none";

export const money = (n: number | string | null | undefined, dp = 2) =>
  Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: dp, maximumFractionDigits: dp });
export const qty = (n: number | string | null | undefined) => Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });
export const dateLabel = (d: string | null | undefined) =>
  d ? new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
export const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());
export const monthStart = (d = today()) => `${d.slice(0, 7)}-01`;

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-leaf-600">{eyebrow}</p>}
        <h1 className="text-3xl font-extrabold tracking-[-0.02em] text-forest-900">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Card({ title, children, className, action }: { title?: string; children: React.ReactNode; className?: string; action?: React.ReactNode }) {
  return (
    <section className={cn("rounded-2xl bg-white p-5 shadow-card", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-lg font-extrabold text-ink-900">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function ButtonLink({ href, children, variant = "solid" }: { href: string; children: React.ReactNode; variant?: "solid" | "outline" }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold",
        variant === "solid" ? "btn-forest" : "border-2 border-forest-800 text-forest-800 hover:bg-mint-50",
      )}
    >
      {children}
    </Link>
  );
}

export function Stat({ label, value, tone }: { label: string; value: string; tone?: "red" | "green" | "dark" }) {
  return (
    <div className={cn("rounded-2xl p-4 shadow-card", tone === "dark" ? "bg-forest-900 text-white" : "bg-white")}>
      <p className={cn("text-xs font-bold uppercase tracking-wider", tone === "dark" ? "text-lime-200" : "text-ink-600")}>{label}</p>
      <p className={cn("mt-1 text-2xl font-extrabold tabular-nums", tone === "red" && "text-red-600", tone === "green" && "text-forest-700")}>{value}</p>
    </div>
  );
}

export function Badge({ children, tone = "grey" }: { children: React.ReactNode; tone?: "grey" | "lime" | "red" | "amber" }) {
  const t = { grey: "bg-ink-900/5 text-ink-600", lime: "bg-lime-200 text-forest-950", red: "bg-red-50 text-red-700", amber: "bg-amber-50 text-amber-800" }[tone];
  return <span className={cn("inline-block rounded-full px-2.5 py-1 text-xs font-bold", t)}>{children}</span>;
}

export type Col<T> = { label: string; get: (r: T) => React.ReactNode; right?: boolean; className?: string };

/** Plain responsive table: scrolls sideways on small screens instead of squashing. */
export function DataTable<T>({ rows, cols, empty = "Nothing here yet.", foot, rowKey }: { rows: T[]; cols: Col<T>[]; empty?: string; foot?: React.ReactNode[]; rowKey?: (r: T, i: number) => string | number }) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-card">
      <table className="w-full text-sm">
        <thead className="bg-mint-50 text-left text-[11px] font-bold uppercase tracking-wider text-ink-600">
          <tr>{cols.map((c) => <th key={c.label} className={cn("whitespace-nowrap px-4 py-3", c.right && "text-right")}>{c.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-ink-900/5">
          {rows.length === 0 && (
            <tr><td colSpan={cols.length} className="px-4 py-10 text-center text-ink-600">{empty}</td></tr>
          )}
          {rows.map((r, i) => (
            <tr key={rowKey ? rowKey(r, i) : i} className="hover:bg-cream-50">
              {cols.map((c) => <td key={c.label} className={cn("px-4 py-2.5", c.right && "text-right tabular-nums", c.className)}>{c.get(r)}</td>)}
            </tr>
          ))}
        </tbody>
        {foot && rows.length > 0 && (
          <tfoot className="border-t-2 border-forest-900/10 font-extrabold">
            <tr>{foot.map((f, i) => <td key={i} className={cn("px-4 py-3", cols[i]?.right && "text-right tabular-nums")}>{f}</td>)}</tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

export function Pager({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-center gap-2 text-sm font-bold">
      {page > 1 && <Link href={href(page - 1)} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 shadow-card"><ChevronLeft className="size-4" /> Prev</Link>}
      <span className="px-2 text-ink-600">Page {page} of {pages}</span>
      {page < pages && <Link href={href(page + 1)} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 shadow-card">Next <ChevronRight className="size-4" /></Link>}
    </div>
  );
}

/** GET form for filters (date range, search, party) — works without JavaScript. */
export function FilterBar({ children }: { children: React.ReactNode }) {
  return (
    <form method="get" className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-card">
      {children}
      <button className="btn-forest rounded-full px-5 py-2 text-sm font-bold">Show</button>
    </form>
  );
}

export function Notice({ tone, children }: { tone: "ok" | "error"; children: React.ReactNode }) {
  return (
    <p role={tone === "error" ? "alert" : "status"} className={cn("mb-5 rounded-2xl px-4 py-3 text-sm font-semibold", tone === "ok" ? "bg-lime-100 text-forest-800" : "bg-red-50 text-red-700 ring-1 ring-red-200")}>
      {children}
    </p>
  );
}
