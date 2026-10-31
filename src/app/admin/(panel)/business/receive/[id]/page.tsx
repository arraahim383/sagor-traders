import { notFound } from "next/navigation";
import { PrintButton } from "@/components/erp/PrintButton";
import { DataTable, dateLabel, money, qty } from "@/components/erp/ui";
import { requireStaff } from "@/lib/admin/auth";

type L = { id: number; carton: number; piece: number; qty: number; free_qty: number; buy_price: number; sale_price: number; subtotal: number; product: { name: string } };

export default async function ReceiveNoteView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const { data: g } = await supabase.from("erp_goods_receipts").select("*, supplier:erp_suppliers(name), po:erp_purchase_orders(po_no), lines:erp_goods_receipt_lines(*, product:erp_products(name))").eq("id", id).maybeSingle();
  if (!g) notFound();
  const lines = (g.lines as L[]).sort((a, b) => a.id - b.id);
  const due = Number(g.payable) - Number(g.paid) - Number(g.advance_applied);
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-[-0.02em] text-forest-900">{g.grn_no}</h1>
        <PrintButton />
      </div>
      <p className="mb-4 text-sm text-ink-600">
        {dateLabel(g.date)} · {g.supplier.name}{g.invoice_no ? ` · invoice ${g.invoice_no}` : ""}{g.po ? ` · ${g.po.po_no}` : ""}
      </p>
      <DataTable
        rows={lines}
        cols={[
          { label: "Product", get: (l) => l.product.name },
          { label: "Carton", right: true, get: (l) => l.carton },
          { label: "Piece", right: true, get: (l) => l.piece },
          { label: "Qty", right: true, get: (l) => qty(l.qty) },
          { label: "Free", right: true, get: (l) => qty(l.free_qty) },
          { label: "Buy", right: true, get: (l) => Number(l.buy_price).toFixed(4) },
          { label: "Sale", right: true, get: (l) => Number(l.sale_price).toFixed(4) },
          { label: "Sub total", right: true, get: (l) => money(l.subtotal) },
        ]}
      />
      <div className="ml-auto mt-4 max-w-xs space-y-1 rounded-2xl bg-white p-5 text-sm shadow-card">
        {[["Sub total", g.subtotal], ["Commission", -g.commission], ["Transport", g.transport], ["Payable", g.payable], ["Paid", g.paid], ["Advance used", g.advance_applied]].map(([k, v]) => (
          <p key={k as string} className="flex justify-between"><span>{k}</span><span className="tabular-nums">{money(v as number)}</span></p>
        ))}
        <p className={`flex justify-between border-t border-ink-900/10 pt-1 font-extrabold ${due > 0.005 ? "text-red-600" : ""}`}><span>Due</span><span className="tabular-nums">{money(due)}</span></p>
      </div>
    </div>
  );
}
