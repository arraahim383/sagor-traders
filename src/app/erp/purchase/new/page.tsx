import { PurchaseForm } from "@/components/erp/PurchaseForm";
import { requireErp } from "@/lib/erp/auth";
import { today } from "@/components/erp/ui";
import { loadPromotions, loadPurchaseProducts, loadSuppliersWithBalance } from "@/lib/erp/data";
import { savePurchase } from "../actions";

export const metadata = { title: "New purchase order" };

export default async function NewPurchaseOrderPage() {
  const { supabase } = await requireErp();
  const [suppliers, products, promos] = await Promise.all([loadSuppliersWithBalance(supabase), loadPurchaseProducts(supabase), loadPromotions(supabase, "purchase", today())]);
  return <PurchaseForm mode="po" suppliers={suppliers} products={products} promos={{ byProduct: [...promos.byProduct], orderWide: promos.orderWide }} onSave={savePurchase} />;
}
