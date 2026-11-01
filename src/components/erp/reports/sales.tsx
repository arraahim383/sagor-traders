import Link from "next/link";
import { DataTable, dateLabel, money, qty } from "@/components/erp/ui";
import { avgPrice, marginPct } from "@/lib/erp/reports";
import { n, rows, total, type Ctx } from "./shared";

type OrderRow = {
  key: string | null; label: string; orders: number; total: number; commission: number; cash_claim: number; cash_damage: number;
  transport: number; dsr_cost: number; discount: number; payable: number; paid: number; cost: number; return_qty: number; damage_qty: number;
};
type LineRow = { key: number | null; label: string; qty: number; free_qty: number; return_qty: number; damage_qty: number; revenue: number; cost: number };
type RateRow = { supplier_id: number | null; supplier: string; product_id: number; product: string; price: number; list_price: number; qty: number; over: number; under: number };

const BY: Record<string, string> = { "daily-sales": "day", "dsr-sales": "dsr", "sr-sales": "sr", "route-sales": "route", "retailer-sales": "retailer", "sales-summary": "day", "invoice-profit": "invoice" };
const LINE_BY: Record<string, string> = { "product-sales": "product", "product-profit": "product", "category-profit": "category", "supplier-profit": "supplier" };
export const SALES_KEYS = [...Object.keys(BY), ...Object.keys(LINE_BY), "rate-diff", "sales-items"];

type ItemRow = { product_id: number; product: string; per: number; qty: number; return_qty: number; damage_qty: number; free_qty: number; revenue: number };

/** Rushda's item-wise summary: cartons and pieces split by the product's pieces per carton. */
async function SalesItems(c: Ctx) {
  const data = rows<ItemRow>(await c.supabase.rpc("erp_rpt_sales_items", { p_from: c.from, p_to: c.to, p_sr: c.sr ?? null, p_route: c.route ?? null }));
  const crt = (r: ItemRow) => Math.floor(n(r.qty) / (r.per || 1));
  const pcs = (r: ItemRow) => n(r.qty) - crt(r) * (r.per || 1);
  return (
    <DataTable
      rows={data}
      empty="No finalized sales for these filters."
      cols={[
        { label: "Item", get: (r) => <b>{r.product}</b> },
        { label: "CRT", right: true, get: (r) => crt(r) },
        { label: "PCS", right: true, get: (r) => qty(pcs(r)) },
        { label: "Total qty", right: true, get: (r) => qty(r.qty) },
        { label: "Return qty", right: true, get: (r) => qty(r.return_qty) },
        { label: "Damage qty", right: true, get: (r) => qty(r.damage_qty) },
        { label: "Free qty", right: true, get: (r) => qty(r.free_qty) },
        { label: "Price", right: true, get: (r) => money(avgPrice(n(r.revenue), n(r.qty)), 4) },
        { label: "Total value", right: true, get: (r) => money(r.revenue) },
      ]}
      foot={["Total", total(data, crt), "", qty(total(data, (r) => n(r.qty))), qty(total(data, (r) => n(r.return_qty))), qty(total(data, (r) => n(r.damage_qty))), qty(total(data, (r) => n(r.free_qty))), "", money(total(data, (r) => n(r.revenue)))]}
    />
  );
}

export async function SalesReport(c: Ctx) {
  if (c.key === "rate-diff") return RateDiff(c);
  if (c.key === "sales-items") return SalesItems(c);
  if (LINE_BY[c.key]) {
    const data = rows<LineRow>(await c.supabase.rpc("erp_rpt_sales_lines", { p_from: c.from, p_to: c.to, p_by: LINE_BY[c.key] }));
    return c.key === "product-sales" ? <ProductSales data={data} /> : <LineProfit data={data} label={LINE_BY[c.key]} />;
  }
  const data = rows<OrderRow>(await c.supabase.rpc("erp_rpt_sales_orders", { p_from: c.from, p_to: c.to, p_by: BY[c.key] }));
  if (c.key === "sales-summary") return <Summary data={data} />;
  if (c.key === "invoice-profit") return <InvoiceProfit data={data} />;
  return <OrderTotals data={data} byDay={c.key === "daily-sales"} />;
}

const due = (r: OrderRow) => n(r.payable) - n(r.paid);

function OrderTotals({ data, byDay }: { data: OrderRow[]; byDay: boolean }) {
  return (
    <DataTable
      rows={data}
      empty="No finalized sales in this period."
      cols={[
        { label: byDay ? "Date" : "Name", get: (r) => <b>{byDay ? dateLabel(r.label) : r.label}</b> },
        { label: "Orders", right: true, get: (r) => r.orders },
        { label: "Total", right: true, get: (r) => money(r.total) },
        { label: "Commission", right: true, get: (r) => money(r.commission) },
        { label: "Payable", right: true, get: (r) => money(r.payable) },
        { label: "Paid", right: true, get: (r) => money(r.paid) },
        { label: "Due", right: true, get: (r) => money(due(r)) },
      ]}
      foot={["Total", total(data, (r) => n(r.orders)), money(total(data, (r) => n(r.total))), money(total(data, (r) => n(r.commission))), money(total(data, (r) => n(r.payable))), money(total(data, (r) => n(r.paid))), money(total(data, due))]}
    />
  );
}

function Summary({ data }: { data: OrderRow[] }) {
  const f = (k: keyof OrderRow) => total(data, (r) => n(r[k]));
  return (
    <DataTable
      rows={data}
      empty="No finalized sales in this period."
      cols={[
        { label: "Date", get: (r) => <b>{dateLabel(r.label)}</b> },
        { label: "Orders", right: true, get: (r) => r.orders },
        { label: "Grand total", right: true, get: (r) => money(r.total) },
        { label: "Commission", right: true, get: (r) => money(r.commission) },
        { label: "Cash claim", right: true, get: (r) => money(r.cash_claim) },
        { label: "Return qty", right: true, get: (r) => qty(r.return_qty) },
        { label: "Damage qty", right: true, get: (r) => qty(r.damage_qty) },
        { label: "Cash damage", right: true, get: (r) => money(r.cash_damage) },
        { label: "Transport", right: true, get: (r) => money(r.transport) },
        { label: "DSR cost", right: true, get: (r) => money(r.dsr_cost) },
        { label: "Discount", right: true, get: (r) => money(r.discount) },
        { label: "Payable", right: true, get: (r) => money(r.payable) },
        { label: "Paid", right: true, get: (r) => money(r.paid) },
        { label: "Due", right: true, get: (r) => money(due(r)) },
      ]}
      foot={["Total", f("orders"), money(f("total")), money(f("commission")), money(f("cash_claim")), qty(f("return_qty")), qty(f("damage_qty")), money(f("cash_damage")), money(f("transport")), money(f("dsr_cost")), money(f("discount")), money(f("payable")), money(f("paid")), money(total(data, due))]}
    />
  );
}

function InvoiceProfit({ data }: { data: OrderRow[] }) {
  const gross = (r: OrderRow) => n(r.total) - n(r.cost);
  const net = (r: OrderRow) => gross(r) - n(r.commission);
  return (
    <DataTable
      rows={data}
      empty="No finalized sales in this period."
      cols={[
        { label: "Invoice", get: (r) => <Link href={`/erp/sales/${r.key}`} className="font-bold text-forest-800 hover:underline">{r.label}</Link> },
        { label: "Revenue", right: true, get: (r) => money(r.total) },
        { label: "COGS", right: true, get: (r) => money(r.cost) },
        { label: "Commission", right: true, get: (r) => money(r.commission) },
        { label: "Gross profit", right: true, get: (r) => money(gross(r)) },
        { label: "Net profit", right: true, get: (r) => <b className={net(r) < 0 ? "text-red-600" : ""}>{money(net(r))}</b> },
      ]}
      foot={["Total", money(total(data, (r) => n(r.total))), money(total(data, (r) => n(r.cost))), money(total(data, (r) => n(r.commission))), money(total(data, gross)), money(total(data, net))]}
    />
  );
}

function ProductSales({ data }: { data: LineRow[] }) {
  return (
    <DataTable
      rows={data}
      empty="No finalized sales in this period."
      cols={[
        { label: "Product", get: (r) => <b>{r.label}</b> },
        { label: "Sold qty", right: true, get: (r) => qty(r.qty) },
        { label: "Free qty", right: true, get: (r) => qty(r.free_qty) },
        { label: "Avg price", right: true, get: (r) => money(avgPrice(n(r.revenue), n(r.qty)), 4) },
        { label: "Revenue", right: true, get: (r) => money(r.revenue) },
        { label: "COGS", right: true, get: (r) => money(r.cost) },
        { label: "Gross profit", right: true, get: (r) => money(n(r.revenue) - n(r.cost)) },
      ]}
      foot={["Total", qty(total(data, (r) => n(r.qty))), qty(total(data, (r) => n(r.free_qty))), "", money(total(data, (r) => n(r.revenue))), money(total(data, (r) => n(r.cost))), money(total(data, (r) => n(r.revenue) - n(r.cost)))]}
    />
  );
}

function LineProfit({ data, label }: { data: LineRow[]; label: string }) {
  const rev = total(data, (r) => n(r.revenue));
  const cost = total(data, (r) => n(r.cost));
  return (
    <DataTable
      rows={data}
      empty="No finalized sales in this period."
      cols={[
        { label: label[0].toUpperCase() + label.slice(1), get: (r) => <b>{r.label}</b> },
        { label: "Sold qty", right: true, get: (r) => qty(r.qty) },
        { label: "Revenue", right: true, get: (r) => money(r.revenue) },
        { label: "COGS", right: true, get: (r) => money(r.cost) },
        { label: "Profit", right: true, get: (r) => money(n(r.revenue) - n(r.cost)) },
        { label: "Margin %", right: true, get: (r) => `${marginPct(n(r.revenue) - n(r.cost), n(r.revenue)).toFixed(1)}%` },
      ]}
      foot={["Total", qty(total(data, (r) => n(r.qty))), money(rev), money(cost), money(rev - cost), `${marginPct(rev - cost, rev).toFixed(1)}%`]}
    />
  );
}

async function RateDiff(c: Ctx) {
  const data = rows<RateRow>(await c.supabase.rpc("erp_rpt_rate_diff", { p_from: c.from, p_to: c.to }));
  const { data: claims } = await c.supabase.from("erp_claims").select("claim_no, supplier_id").eq("type", "Rate Difference").eq("period_from", c.from).eq("period_to", c.to);
  const bySup = new Map<string, { id: number | null; name: string; over: number; under: number }>();
  for (const r of data) {
    const k = String(r.supplier_id);
    const s = bySup.get(k) ?? { id: r.supplier_id, name: r.supplier, over: 0, under: 0 };
    s.over += n(r.over);
    s.under += n(r.under);
    bySup.set(k, s);
  }
  const sups = [...bySup.values()];
  return (
    <div className="space-y-6">
      <DataTable
        rows={sups}
        empty="Every line sold at the list price in this period."
        cols={[
          { label: "Supplier", get: (s) => <b>{s.name}</b> },
          { label: "Over", right: true, get: (s) => money(s.over) },
          { label: "Under", right: true, get: (s) => money(s.under) },
          { label: "Balance", right: true, get: (s) => <b className={s.over - s.under < 0 ? "text-red-600" : ""}>{money(s.over - s.under)}</b> },
          {
            label: "Claim",
            get: (s) => {
              const done = (claims ?? []).filter((x) => x.supplier_id === s.id).map((x) => x.claim_no);
              if (done.length) return <span className="text-xs font-bold text-forest-700">{done.join(", ")}</span>;
              const bal = Math.round((s.over - s.under) * 100) / 100;
              return s.id && bal < 0 ? (
                <Link href={`/erp/claims?kind=${encodeURIComponent("Rate Difference")}&supplier=${s.id}&amount=${Math.abs(bal)}&from=${c.from}&to=${c.to}`} className="rounded-lg bg-forest-900 px-2.5 py-1 text-xs font-bold text-white print:hidden">
                  Cash claim
                </Link>
              ) : "—";
            },
          },
        ]}
      />
      <DataTable
        rows={data}
        cols={[
          { label: "Supplier", get: (r) => r.supplier },
          { label: "Product", get: (r) => <b>{r.product}</b> },
          { label: "Sold qty", right: true, get: (r) => qty(r.qty) },
          { label: "Actual price", right: true, get: (r) => money(r.list_price, 4) },
          { label: "Sold price", right: true, get: (r) => money(r.price, 4) },
          { label: "Over", right: true, get: (r) => (n(r.over) ? money(r.over) : "") },
          { label: "Under", right: true, get: (r) => (n(r.under) ? money(r.under) : "") },
        ]}
      />
      <p className="text-xs text-ink-400">Difference = (sold price − product&apos;s list sale price) × sold qty. A negative balance is price support the supplier owes back; &ldquo;Cash claim&rdquo; raises a rate-difference claim for it.</p>
    </div>
  );
}
