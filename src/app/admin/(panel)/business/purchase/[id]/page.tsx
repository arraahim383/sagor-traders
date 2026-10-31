import { notFound } from "next/navigation";
import { PrintButton } from "@/components/erp/PrintButton";
import { Badge, ButtonLink, DataTable, dateLabel, money, qty } from "@/components/erp/ui";
import { requireStaff } from "@/lib/admin/auth";

type L = { id: number; carton: number; piece: number; qty: number; received_qty: number; buy_price: number; subtotal: number; product: { name: string } };

export default async function PurchaseOrderView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const { data: po } = await supabase.from("erp_purchase_orders").select("*, supplier:erp_suppliers(name, mobile), lines:erp_purchase_order_lines(*, product:erp_products(name))").eq("id", id).maybeSingle();
  if (!po) notFound();
  const lines = (po.lines as L[]).sort((a, b) => a.id - b.id);
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-extrabold tracking-[-0.02em] text-forest-900">{po.po_no}</h1>
          <Badge tone={po.status === "received" ? "lime" : "amber"}>{po.status}</Badge>
        </div>
        <div className="flex gap-2 print:hidden">
          {po.status === "open" && <ButtonLink href="/admin/business/receive/new">Receive goods</ButtonLink>}
          <PrintButton />
        </div>
      </div>
      <p className="mb-4 text-sm text-ink-600">{dateLabel(po.date)} · {po.supplier.name}{po.remark ? ` · ${po.remark}` : ""}</p>
      <DataTable
        rows={lines}
        cols={[
          { label: "Product", get: (l) => l.product.name },
          { label: "Carton", right: true, get: (l) => l.carton },
          { label: "Piece", right: true, get: (l) => l.piece },
          { label: "Qty", right: true, get: (l) => qty(l.qty) },
          { label: "Received", right: true, get: (l) => qty(l.received_qty) },
          { label: "Buy price", right: true, get: (l) => Number(l.buy_price).toFixed(4) },
          { label: "Sub total", right: true, get: (l) => money(l.subtotal) },
        ]}
        foot={["Total", "", "", qty(lines.reduce((s, l) => s + Number(l.qty), 0)), qty(lines.reduce((s, l) => s + Number(l.received_qty), 0)), "", money(po.subtotal)]}
      />
    </div>
  );
}
