import { PurchaseForm } from "@/components/erp/PurchaseForm";
import { requireStaff } from "@/lib/admin/auth";
import { loadPurchaseProducts, loadSuppliersWithBalance } from "@/lib/erp/data";
import { savePurchase } from "../actions";

export const metadata = { title: "New purchase order" };

export default async function NewPurchaseOrderPage() {
  const { supabase } = await requireStaff();
  const [suppliers, products] = await Promise.all([loadSuppliersWithBalance(supabase), loadPurchaseProducts(supabase)]);
  return <PurchaseForm mode="po" suppliers={suppliers} products={products} onSave={savePurchase} />;
}
