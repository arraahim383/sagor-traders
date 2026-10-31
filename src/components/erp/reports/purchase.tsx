import Link from "next/link";
import { Badge, DataTable, dateLabel, money, qty } from "@/components/erp/ui";
import { selectAll } from "@/lib/erp/data";
import { poPending } from "@/lib/erp/purchase";
import { avgPrice } from "@/lib/erp/reports";
import { n, rows, total, type Ctx } from "./shared";

type Grn = { id: number; grn_no: string; date: string; invoice_no: string | null; subtotal: number; commission: number; transport: number; payable: number; paid: number; advance_applied: number; supplier: { name: string } };
type GrnLine = { id: number; carton: number; piece: number; qty: number; free_qty: number; buy_price: number; subtotal: number; is_free: boolean; grn: { id: number; grn_no: string; date: string; supplier: { name: string } }; product: { name: string; category: { name: string } | null } };
type RecvRow = { key: number | null; label: string; notes: number; qty: number; free_qty: number; amount: number };
type PoLine = { id: number; qty: number; received_qty: number; subtotal: number; is_free: boolean; po: { id: number; po_no: string; date: string; status: string; supplier: { name: string } }; product: { name: string } };

export const PURCHASE_KEYS = ["grn-notes", "grn-products", "product-receive", "category-receive", "grn-summary", "po-vs-grn"];

const grnDue = (g: Grn) => Math.max(0, n(g.payable) - n(g.paid) - n(g.advance_applied));

export async function PurchaseReport(c: Ctx) {
  if (c.key === "product-receive" || c.key === "category-receive") {
    const data = rows<RecvRow>(await c.supabase.rpc("erp_rpt_receive", { p_from: c.from, p_to: c.to, p_by: c.key === "product-receive" ? "product" : "category" }));
    return (
      <DataTable
        rows={data}
        empty="Nothing received in this period."
        cols={[
          { label: c.key === "product-receive" ? "Product" : "Category", get: (r) => <b>{r.label}</b> },
          { label: "Receive notes", right: true, get: (r) => r.notes },
          { label: "Total qty", right: true, get: (r) => qty(r.qty) },
          { label: "Free qty", right: true, get: (r) => qty(r.free_qty) },
          { label: "Avg price", right: true, get: (r) => money(avgPrice(n(r.amount), n(r.qty)), 4) },
          { label: "Total amount", right: true, get: (r) => money(r.amount) },
        ]}
        foot={["Total", "", qty(total(data, (r) => n(r.qty))), qty(total(data, (r) => n(r.free_qty))), "", money(total(data, (r) => n(r.amount)))]}
      />
    );
  }
  if (c.key === "grn-products") {
    const data = await selectAll<GrnLine>((a, b) =>
      c.supabase
        .from("erp_goods_receipt_lines")
        .select("id, carton, piece, qty, free_qty, buy_price, subtotal, is_free, grn:erp_goods_receipts!inner(id, grn_no, date, supplier:erp_suppliers(name)), product:erp_products(name, category:erp_categories(name))")
        .gte("grn.date", c.from)
        .lte("grn.date", c.to)
        .order("id")
        .range(a, b) as never,
    );
    return (
      <DataTable
        rows={data}
        empty="Nothing received in this period."
        cols={[
          { label: "Date", get: (r) => dateLabel(r.grn.date) },
          { label: "GRN", get: (r) => <Link href={`/admin/business/receive/${r.grn.id}`} className="font-bold text-forest-800 hover:underline">{r.grn.grn_no}</Link> },
          { label: "Supplier", get: (r) => r.grn.supplier.name },
          { label: "Product", get: (r) => <b>{r.product.name}{r.is_free ? " (free)" : ""}</b> },
          { label: "Category", get: (r) => r.product.category?.name ?? "—" },
          { label: "Carton", right: true, get: (r) => r.carton },
          { label: "Piece", right: true, get: (r) => r.piece },
          { label: "Qty", right: true, get: (r) => qty(r.qty) },
          { label: "Free", right: true, get: (r) => qty(r.free_qty) },
          { label: "Buy price", right: true, get: (r) => money(r.buy_price, 4) },
          { label: "Amount", right: true, get: (r) => money(r.subtotal) },
        ]}
        foot={["Total", "", "", "", "", "", "", qty(total(data, (r) => n(r.qty))), qty(total(data, (r) => n(r.free_qty))), "", money(total(data, (r) => n(r.subtotal)))]}
      />
    );
  }
  if (c.key === "po-vs-grn") {
    const data = await selectAll<PoLine>((a, b) =>
      c.supabase
        .from("erp_purchase_order_lines")
        .select("id, qty, received_qty, subtotal, is_free, po:erp_purchase_orders!inner(id, po_no, date, status, supplier:erp_suppliers(name)), product:erp_products(name)")
        .gte("po.date", c.from)
        .lte("po.date", c.to)
        .order("id")
        .range(a, b) as never,
    );
    return (
      <DataTable
        rows={data}
        empty="No purchase orders in this period."
        cols={[
          { label: "PO", get: (r) => <Link href={`/admin/business/purchase/${r.po.id}`} className="font-bold text-forest-800 hover:underline">{r.po.po_no}</Link> },
          { label: "Date", get: (r) => dateLabel(r.po.date) },
          { label: "Supplier", get: (r) => r.po.supplier.name },
          { label: "Product", get: (r) => <b>{r.product.name}{r.is_free ? " (free)" : ""}</b> },
          { label: "Ordered", right: true, get: (r) => qty(r.qty) },
          { label: "Received", right: true, get: (r) => qty(r.received_qty) },
          { label: "Pending", right: true, get: (r) => qty(poPending(n(r.qty), n(r.received_qty))) },
          { label: "Amount", right: true, get: (r) => money(r.subtotal) },
          { label: "Status", get: (r) => <Badge tone={poPending(n(r.qty), n(r.received_qty)) > 0 ? "amber" : "lime"}>{poPending(n(r.qty), n(r.received_qty)) > 0 ? "Pending" : "Received"}</Badge> },
        ]}
        foot={["Total", "", "", "", qty(total(data, (r) => n(r.qty))), qty(total(data, (r) => n(r.received_qty))), qty(total(data, (r) => poPending(n(r.qty), n(r.received_qty)))), money(total(data, (r) => n(r.subtotal))), ""]}
      />
    );
  }

  const grns = await selectAll<Grn>((a, b) =>
    c.supabase
      .from("erp_goods_receipts")
      .select("id, grn_no, date, invoice_no, subtotal, commission, transport, payable, paid, advance_applied, supplier:erp_suppliers(name)")
      .gte("date", c.from)
      .lte("date", c.to)
      .order("date")
      .order("id")
      .range(a, b) as never,
  );
  const f = (list: Grn[], k: keyof Grn) => total(list, (g) => n(g[k]));
  if (c.key === "grn-summary") {
    const groups = new Map<string, Grn[]>();
    for (const g of grns) groups.set(g.supplier.name, [...(groups.get(g.supplier.name) ?? []), g]);
    const sums = [...groups.entries()].map(([name, list]) => ({ name, list }));
    return (
      <DataTable
        rows={sums}
        empty="Nothing received in this period."
        cols={[
          { label: "Supplier", get: (s) => <b>{s.name}</b> },
          { label: "Receive notes", right: true, get: (s) => s.list.length },
          { label: "Subtotal", right: true, get: (s) => money(f(s.list, "subtotal")) },
          { label: "Commission", right: true, get: (s) => money(f(s.list, "commission")) },
          { label: "Transport", right: true, get: (s) => money(f(s.list, "transport")) },
          { label: "Payable", right: true, get: (s) => money(f(s.list, "payable")) },
          { label: "Paid", right: true, get: (s) => money(f(s.list, "paid") + f(s.list, "advance_applied")) },
          { label: "Due", right: true, get: (s) => money(total(s.list, grnDue)) },
        ]}
        foot={["Total", grns.length, money(f(grns, "subtotal")), money(f(grns, "commission")), money(f(grns, "transport")), money(f(grns, "payable")), money(f(grns, "paid") + f(grns, "advance_applied")), money(total(grns, grnDue))]}
      />
    );
  }
  return (
    <DataTable
      rows={grns}
      empty="Nothing received in this period."
      cols={[
        { label: "GRN", get: (g) => <Link href={`/admin/business/receive/${g.id}`} className="font-bold text-forest-800 hover:underline">{g.grn_no}</Link> },
        { label: "Date", get: (g) => dateLabel(g.date) },
        { label: "Supplier", get: (g) => g.supplier.name },
        { label: "Invoice", get: (g) => g.invoice_no ?? "—" },
        { label: "Subtotal", right: true, get: (g) => money(g.subtotal) },
        { label: "Commission", right: true, get: (g) => money(g.commission) },
        { label: "Transport", right: true, get: (g) => money(g.transport) },
        { label: "Payable", right: true, get: (g) => money(g.payable) },
        { label: "Paid", right: true, get: (g) => money(n(g.paid) + n(g.advance_applied)) },
        { label: "Due", right: true, get: (g) => money(grnDue(g)) },
        { label: "Status", get: (g) => <Badge tone={grnDue(g) > 0.005 ? "amber" : "lime"}>{grnDue(g) > 0.005 ? "Due" : "Paid"}</Badge> },
      ]}
      foot={["Total", "", "", "", money(f(grns, "subtotal")), money(f(grns, "commission")), money(f(grns, "transport")), money(f(grns, "payable")), money(f(grns, "paid") + f(grns, "advance_applied")), money(total(grns, grnDue)), ""]}
    />
  );
}
