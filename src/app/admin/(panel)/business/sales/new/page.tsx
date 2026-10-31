import { SalesOrderForm } from "@/components/erp/SalesOrderForm";
import { today } from "@/components/erp/ui";
import { requireStaff } from "@/lib/admin/auth";
import { loadParties, loadProducts, loadPromotions } from "@/lib/erp/data";
import { saveSalesOrder } from "../actions";

export const metadata = { title: "New sales order" };

export default async function NewSalesOrderPage() {
  const { supabase } = await requireStaff();
  const [products, parties, promos] = await Promise.all([loadProducts(supabase), loadParties(supabase), loadPromotions(supabase, "sales", today())]);
  const withPromo = products.map((p) => ({ ...p, promo: promos.byProduct.get(p.id) ?? null }));
  return <SalesOrderForm products={withPromo} {...parties} orderWideOffers={promos.orderWide} onSave={saveSalesOrder} dataNote="Live stock · FIFO lots" />;
}
