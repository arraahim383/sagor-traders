import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin/auth";
import { selectAll } from "@/lib/erp/data";
import { Card, DataTable, PageHeader, Stat, dateLabel, money, qty } from "@/components/erp/ui";

const SOURCE: Record<string, string> = {
  opening: "Opening stock",
  sale: "Sale",
  sale_damage: "Damaged (sale)",
  erp_goods_receipts: "Goods receive",
  erp_stock_adjustments: "Stock adjust",
  erp_damage_notes: "Damage",
};

export default async function StockCard({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string; to?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireStaff();
  const [{ data: p }, moves, { data: lots }] = await Promise.all([
    supabase.from("erp_stock_list").select("*").eq("id", id).maybeSingle(),
    selectAll<{ id: number; date: string; qty: number; rate: number; source: string; source_id: number | null; note: string | null }>((a, b) =>
      supabase.from("erp_stock_moves").select("id, date, qty, rate, source, source_id, note").eq("product_id", id).order("date").order("id").range(a, b),
    ),
    supabase.from("erp_lots").select("id, received_on, qty, qty_left, rate, sale, source").eq("product_id", id).gt("qty_left", 0).order("received_on").order("id"),
  ]);
  if (!p) notFound();
  let bal = 0;
  const rows = moves.map((m) => ({ ...m, balance: (bal += Number(m.qty)) })).filter((m) => (!sp.from || m.date >= sp.from) && (!sp.to || m.date <= sp.to));
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="Stock card" title={p.name} />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="In stock (pcs)" value={qty(p.stock)} tone="dark" />
        <Stat label="Value at cost" value={money(p.value)} />
        <Stat label="Pieces / carton" value={String(p.per)} />
        <Stat label="Damaged, unclaimed" value={qty(p.damaged_unclaimed)} />
      </div>
      <Card title="Open lots (sold oldest first)" className="mb-6">
        <DataTable
          rows={lots ?? []}
          empty="No stock."
          cols={[
            { label: "Received", get: (l) => dateLabel(l.received_on) },
            { label: "From", get: (l) => SOURCE[l.source] ?? l.source },
            { label: "Qty in", right: true, get: (l) => qty(l.qty) },
            { label: "Left", right: true, get: (l) => qty(l.qty_left) },
            { label: "Cost", right: true, get: (l) => Number(l.rate).toFixed(4) },
            { label: "Sale", right: true, get: (l) => Number(l.sale).toFixed(4) },
          ]}
        />
      </Card>
      <DataTable
        rows={rows}
        empty="No movements yet."
        cols={[
          { label: "Date", get: (m) => dateLabel(m.date) },
          { label: "Movement", get: (m) => SOURCE[m.source] ?? m.source },
          { label: "In", right: true, get: (m) => (Number(m.qty) > 0 ? qty(m.qty) : "") },
          { label: "Out", right: true, get: (m) => (Number(m.qty) < 0 ? qty(-m.qty) : "") },
          { label: "Rate", right: true, get: (m) => Number(m.rate).toFixed(4) },
          { label: "Balance", right: true, get: (m) => <b>{qty(m.balance)}</b> },
        ]}
      />
    </div>
  );
}
