import Link from "next/link";
import { Badge, DataTable, FilterBar, PageHeader, dateLabel, fieldCls, labelCls, money, monthStart, qty, today } from "@/components/erp/ui";
import { requireErp } from "@/lib/erp/auth";
import { selectAll } from "@/lib/erp/data";

export const metadata = { title: "SR sales orders" };

type O = {
  id: number; invoice_no: string; date: string; status: string; total: number; cash_damage: number;
  sr: { name: string } | null; retailer: { code: string; name: string; route: { name: string } | null } | null;
  lines: { damage_qty: number; free_qty: number }[];
};

export default async function SrOrders({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; sr?: string; route?: string; status?: string }> }) {
  const sp = await searchParams;
  const from = sp.from || monthStart();
  const to = sp.to || today();
  const { supabase } = await requireErp();
  const [{ data: srs }, { data: routes }] = await Promise.all([
    supabase.from("erp_staff").select("id, name").eq("kind", "sr").order("name"),
    supabase.from("erp_routes").select("id, name").order("name"),
  ]);
  const all = await selectAll<O>((a, b) => {
    let q = supabase
      .from("erp_sales_orders")
      .select("id, invoice_no, date, status, total, cash_damage, sr:erp_staff!erp_sales_orders_sr_id_fkey(name), retailer:erp_retailers(code, name, route_id, route:erp_routes(name)), lines:erp_sales_lines(damage_qty, free_qty)")
      .not("sr_id", "is", null)
      .gte("date", from)
      .lte("date", to);
    if (sp.sr) q = q.eq("sr_id", sp.sr);
    if (sp.status) q = q.eq("status", sp.status);
    return q.order("date").order("id").range(a, b) as never;
  });
  const rows = sp.route ? all.filter((o) => String((o.retailer as unknown as { route_id: number | null } | null)?.route_id ?? "") === sp.route) : all;
  const dmg = (o: O) => o.lines.reduce((s, l) => s + Number(l.damage_qty), 0);
  const free = (o: O) => o.lines.reduce((s, l) => s + Number(l.free_qty), 0);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Sales & Order" title="SR sales orders" />
      <FilterBar>
        <label><span className={labelCls}>From</span><input type="date" name="from" defaultValue={from} className={fieldCls} /></label>
        <label><span className={labelCls}>To</span><input type="date" name="to" defaultValue={to} className={fieldCls} /></label>
        <label><span className={labelCls}>SR</span><select name="sr" defaultValue={sp.sr ?? ""} className={fieldCls}><option value="">All</option>{(srs ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label><span className={labelCls}>Route</span><select name="route" defaultValue={sp.route ?? ""} className={fieldCls}><option value="">All</option>{(routes ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
        <label><span className={labelCls}>Status</span><select name="status" defaultValue={sp.status ?? ""} className={fieldCls}><option value="">All</option><option value="draft">Submitted (draft)</option><option value="finalized">Finalized</option></select></label>
      </FilterBar>
      <DataTable
        rows={rows}
        empty="No SR orders in this period."
        cols={[
          { label: "Order", get: (o) => <Link href={o.status === "draft" ? `/erp/sales/${o.id}/edit` : `/erp/sales/${o.id}`} className="font-bold text-forest-800 hover:underline">{o.invoice_no}</Link> },
          { label: "Date", get: (o) => dateLabel(o.date) },
          { label: "Retailer", get: (o) => (o.retailer ? `${o.retailer.code} - ${o.retailer.name}` : "—") },
          { label: "Route", get: (o) => o.retailer?.route?.name ?? "—" },
          { label: "SR", get: (o) => o.sr?.name ?? "—" },
          { label: "Amount", right: true, get: (o) => money(o.total) },
          { label: "Damage qty", right: true, get: (o) => qty(dmg(o)) },
          { label: "Damage amt", right: true, get: (o) => money(o.cash_damage) },
          { label: "Free qty", right: true, get: (o) => qty(free(o)) },
          { label: "Status", get: (o) => <Badge tone={o.status === "finalized" ? "lime" : "amber"}>{o.status === "draft" ? "Submitted" : "Finalized"}</Badge> },
        ]}
        foot={["Total", "", "", "", "", money(rows.reduce((s, o) => s + Number(o.total), 0)), qty(rows.reduce((s, o) => s + dmg(o), 0)), money(rows.reduce((s, o) => s + Number(o.cash_damage), 0)), qty(rows.reduce((s, o) => s + free(o), 0)), ""]}
      />
    </div>
  );
}
