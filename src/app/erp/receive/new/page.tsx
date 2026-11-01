import { PurchaseForm, type OpenPO } from "@/components/erp/PurchaseForm";
import { requireErp } from "@/lib/erp/auth";
import { loadPurchaseProducts, loadSuppliersWithBalance } from "@/lib/erp/data";
import { savePurchase } from "../../purchase/actions";

export const metadata = { title: "Goods receive" };

export default async function GoodsReceivePage() {
  const { supabase } = await requireErp();
  const [suppliers, products, pos] = await Promise.all([
    loadSuppliersWithBalance(supabase),
    loadPurchaseProducts(supabase),
    supabase.from("erp_purchase_orders").select("id, po_no, supplier_id, lines:erp_purchase_order_lines(product_id, qty, received_qty, buy_price)").eq("status", "open").order("id", { ascending: false }),
  ]);
  const openPOs: OpenPO[] = (pos.data ?? []).map((p) => ({
    id: p.id,
    poNo: p.po_no,
    supplierId: p.supplier_id,
    lines: (p.lines as { product_id: number; qty: number; received_qty: number; buy_price: number }[]).map((l) => ({ productId: l.product_id, remaining: Math.max(0, Number(l.qty) - Number(l.received_qty)), buy: Number(l.buy_price) })),
  }));
  return <PurchaseForm mode="grn" suppliers={suppliers} products={products} openPOs={openPOs} onSave={savePurchase} />;
}
