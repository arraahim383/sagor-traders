import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus, Search } from "lucide-react";
import { requireStaff } from "@/lib/admin/auth";
import { partyBalances } from "@/lib/erp/data";
import { MASTERS } from "@/lib/erp/masters";
import { margin } from "@/lib/erp/people";
import { Badge, ButtonLink, Notice, PageHeader, Pager, fieldCls, money, qty } from "@/components/erp/ui";
import { setActive } from "../actions";

const PAGE = 50;

function pick(row: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, k) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[k] : undefined), row);
}

export default async function MasterList({ params, searchParams }: { params: Promise<{ master: string }>; searchParams: Promise<{ q?: string; p?: string; saved?: string; all?: string }> }) {
  const { master } = await params;
  const m = MASTERS[master];
  if (!m) notFound();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.p) || 1);
  const q = (sp.q ?? "").replace(/[,()%*\\]/g, " ").trim();
  const { supabase } = await requireStaff();

  let query = supabase.from(m.table).select(m.select, { count: "exact" }).order(m.order).range((page - 1) * PAGE, page * PAGE - 1);
  if (q) query = query.or(m.search.map((f) => `${f}.ilike.%${q}%`).join(","));
  if (m.hasActive && !sp.all) query = query.eq("active", true);
  const { data, count, error } = await query;
  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  const balances = m.balance ? await partyBalances(supabase, m.balance, rows.map((r) => Number(r.id))) : null;
  if (m.key === "products" && rows.length) {
    const { data: st } = await supabase.from("erp_product_stock").select("product_id, stock").in("product_id", rows.map((r) => Number(r.id)));
    const map = new Map((st ?? []).map((s) => [Number(s.product_id), Number(s.stock)]));
    for (const r of rows) r.stock = map.get(Number(r.id)) ?? 0;
  }
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const href = (p: number) => `?${new URLSearchParams({ ...(q ? { q } : {}), ...(sp.all ? { all: "1" } : {}), p: String(p) })}`;

  const cell = (row: Record<string, unknown>, c: (typeof m.columns)[number]) => {
    if (c.get === "balance") {
      const b = balances?.get(Number(row.id)) ?? 0;
      const shown = m.balance === "supplier" ? -b : b;
      return <span className={shown > 0.005 ? "font-bold text-red-600" : shown < -0.005 ? "font-bold text-forest-700" : "text-ink-400"}>{money(shown)}</span>;
    }
    if (c.get === "margin") return `${margin(Number(row.buy_price), Number(row.sale_price)).toFixed(2)}%`;
    if (c.get === "target") return row.basis === "value" ? `৳${money(row.target_amount as number)}` : `${qty(row.target_qty as number)} pcs`;
    if (c.get === "free") return ((row.free_options as { name: string; qty: number }[]) ?? []).map((o) => `${o.name} × ${o.qty}`).join(", ") || "—";
    const v = pick(row, c.get);
    if (c.kind === "money") return money(v as number);
    if (c.kind === "qty") return qty(v as number);
    if (c.get === "kind") return <Badge tone="lime">{String(v).toUpperCase()}</Badge>;
    return v == null || v === "" ? "—" : String(v);
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader eyebrow="Master list" title={m.title}>
        <ButtonLink href={`/admin/business/m/${m.key}/new`}><Plus className="size-4" /> Add {m.singular}</ButtonLink>
      </PageHeader>
      {sp.saved && <Notice tone="ok">Saved.</Notice>}
      {error && <Notice tone="error">{error.message}</Notice>}

      <form method="get" className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
          <input name="q" defaultValue={q} placeholder={`Search ${m.title.toLowerCase()}`} className={`${fieldCls} pl-9`} />
        </div>
        {m.hasActive && (
          <label className="flex items-center gap-2 text-sm font-semibold text-ink-600">
            <input type="checkbox" name="all" value="1" defaultChecked={!!sp.all} className="size-4 accent-forest-700" /> Include inactive
          </label>
        )}
        <button className="btn-forest rounded-full px-5 py-2 text-sm font-bold">Search</button>
        <span className="text-sm text-ink-600">{count ?? 0} found</span>
      </form>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-mint-50 text-left text-[11px] font-bold uppercase tracking-wider text-ink-600">
            <tr>
              {m.columns.map((c) => <th key={c.label} className={`whitespace-nowrap px-4 py-3 ${c.right ? "text-right" : ""}`}>{c.label}</th>)}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-900/5">
            {rows.length === 0 && <tr><td colSpan={m.columns.length + 1} className="px-4 py-10 text-center text-ink-600">Nothing found.</td></tr>}
            {rows.map((row) => (
              <tr key={String(row.id)} className={row.active === false ? "opacity-50" : "hover:bg-cream-50"}>
                {m.columns.map((c, i) => (
                  <td key={c.label} className={`px-4 py-2.5 ${c.right ? "text-right tabular-nums" : ""} ${i === 0 || c.get === m.nameField ? "font-semibold text-ink-900" : ""}`}>{cell(row, c)}</td>
                ))}
                <td className="whitespace-nowrap px-4 py-2.5 text-right">
                  <Link href={`/admin/business/m/${m.key}/${row.id}`} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-forest-700 hover:bg-mint-50">
                    <Pencil className="size-3.5" /> Edit
                  </Link>
                  {m.hasActive && (
                    <form action={setActive.bind(null, m.key, String(row.id), row.active === false)} className="inline">
                      <button className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-ink-600 hover:bg-ink-900/5">{row.active === false ? "Activate" : "Deactivate"}</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={page} pages={pages} href={href} />
    </div>
  );
}
