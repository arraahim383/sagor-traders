import Link from "next/link";
import { Card, DataTable, PageHeader, dateLabel, money, qty } from "@/components/erp/ui";
import { requireErp } from "@/lib/erp/auth";
import { selectAll } from "@/lib/erp/data";

export const metadata = { title: "Delivery pending" };

type O = {
  id: number; invoice_no: string; date: string; total: number; retailer_id: number | null;
  sr: { name: string } | null; dsr: { name: string } | null; retailer: { code: string; name: string; route: { name: string } | null } | null;
  lines: { sold_qty: number; free_qty: number; is_free: boolean }[];
};

/** Orders submitted (saved as draft) but not yet delivered and finalized. */
export default async function DeliveryPending() {
  const { supabase } = await requireErp();
  const orders = await selectAll<O>((a, b) =>
    supabase
      .from("erp_sales_orders")
      .select("id, invoice_no, date, total, retailer_id, sr:erp_staff!erp_sales_orders_sr_id_fkey(name), dsr:erp_staff!erp_sales_orders_dsr_id_fkey(name), retailer:erp_retailers(code, name, route:erp_routes(name)), lines:erp_sales_lines(sold_qty, free_qty, is_free)")
      .eq("status", "draft")
      .order("date")
      .order("id")
      .range(a, b) as never,
  );
  const q = (o: O) => o.lines.reduce((s, l) => s + (l.is_free ? 0 : Number(l.sold_qty)), 0);
  const f = (o: O) => o.lines.reduce((s, l) => s + Number(l.free_qty), 0);
  const groups = new Map<string, O[]>();
  for (const o of orders) {
    const k = o.retailer ? `${o.retailer.code} - ${o.retailer.name}` : "No shop";
    groups.set(k, [...(groups.get(k) ?? []), o]);
  }
  const byShop = [...groups.entries()].map(([shop, list]) => ({ shop, list }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader eyebrow="Sales & Order" title="Delivery pending" />
      <Card title="By retailer">
        <DataTable
          rows={byShop}
          empty="Nothing waiting for delivery."
          cols={[
            { label: "Retailer", get: (g) => <b>{g.shop}</b> },
            { label: "Route", get: (g) => g.list[0].retailer?.route?.name ?? "—" },
            { label: "Orders", right: true, get: (g) => g.list.length },
            { label: "SR", get: (g) => [...new Set(g.list.map((o) => o.sr?.name).filter(Boolean))].join(", ") || "—" },
            { label: "Qty", right: true, get: (g) => qty(g.list.reduce((s, o) => s + q(o), 0)) },
            { label: "Free qty", right: true, get: (g) => qty(g.list.reduce((s, o) => s + f(o), 0)) },
            { label: "Amount", right: true, get: (g) => money(g.list.reduce((s, o) => s + Number(o.total), 0)) },
          ]}
          foot={["Total", "", orders.length, "", qty(orders.reduce((s, o) => s + q(o), 0)), qty(orders.reduce((s, o) => s + f(o), 0)), money(orders.reduce((s, o) => s + Number(o.total), 0))]}
        />
      </Card>
      <Card title="By order">
        <DataTable
          rows={orders}
          empty="Nothing waiting for delivery."
          cols={[
            { label: "Order", get: (o) => <Link href={`/erp/sales/${o.id}/edit`} className="font-bold text-forest-800 hover:underline">{o.invoice_no}</Link> },
            { label: "Date", get: (o) => dateLabel(o.date) },
            { label: "DSR / SR", get: (o) => o.dsr?.name ?? o.sr?.name ?? "—" },
            { label: "Items", right: true, get: (o) => o.lines.filter((l) => !l.is_free).length },
            { label: "Free qty", right: true, get: (o) => qty(f(o)) },
            { label: "Order value", right: true, get: (o) => money(o.total) },
          ]}
        />
      </Card>
      <p className="text-xs text-ink-400">Open an order and finalize it once delivered; that takes the stock out (FIFO) and posts it to the books.</p>
    </div>
  );
}
