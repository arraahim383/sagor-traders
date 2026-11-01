import { notFound, redirect } from "next/navigation";
import { SalesOrderForm } from "@/components/erp/SalesOrderForm";
import { requireErp } from "@/lib/erp/auth";
import { loadParties, loadProducts, loadPromotions } from "@/lib/erp/data";
import type { CashAccount } from "@/lib/erp/accounting";
import type { SalesOrderInput } from "@/lib/erp/sales-payload";
import { saveSalesOrder } from "../../actions";

export default async function EditDraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireErp();
  const { data: o } = await supabase
    .from("erp_sales_orders")
    .select("*, lines:erp_sales_lines(*), payments:erp_sale_payments(amount, account:erp_accounts(key))")
    .eq("id", id)
    .maybeSingle();
  if (!o) notFound();
  if (o.status !== "draft") redirect(`/erp/sales/${id}`);

  const [products, parties, promos] = await Promise.all([loadProducts(supabase), loadParties(supabase), loadPromotions(supabase, "sales", o.date)]);
  type L = { product_id: number; carton: number; piece: number; return_qty: number; damage_qty: number; free_qty: number; price: number; manual: boolean; is_free: boolean };
  const lines = (o.lines as L[]).filter((l) => !l.is_free);
  const payments = (o.payments as { amount: number; account: { key: CashAccount } }[]) ?? [];
  const initial: SalesOrderInput & { orderId: number; invoiceNo: string } = {
    orderId: o.id,
    invoiceNo: o.invoice_no,
    status: "draft",
    date: o.date,
    type: o.type,
    srId: o.sr_id,
    dsrId: o.dsr_id,
    retailerId: o.retailer_id,
    lines: lines.map((l) => ({ productId: l.product_id, carton: l.carton, piece: l.piece, ret: l.return_qty, dmg: l.damage_qty, freeQty: Number(l.free_qty), price: Number(l.price), manual: l.manual })),
    freeLines: [],
    deductions: { commission: Number(o.commission), cashClaim: Number(o.cash_claim), cashDamage: Number(o.cash_damage), transport: Number(o.transport), dsrCost: Number(o.dsr_cost), discount: Number(o.discount) },
    paidInput: Number(o.paid),
    fullPaid: false,
    paymentMode: o.payment_mode ?? "Cash",
    depositAccount: null,
    split: o.payment_mode === "Split" ? payments.map((p) => ({ account: p.account.key, amount: Number(p.amount) })) : null,
    remark: o.remark ?? "",
  };
  const withPromo = products.map((p) => ({ ...p, promo: promos.byProduct.get(p.id) ?? null }));
  return <SalesOrderForm products={withPromo} {...parties} orderWideOffers={promos.orderWide} onSave={saveSalesOrder} dataNote="Live stock · FIFO lots" initial={initial} />;
}
