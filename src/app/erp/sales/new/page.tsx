import { SalesOrderForm } from "@/components/erp/SalesOrderForm";
import { today } from "@/components/erp/ui";
import { requireErp } from "@/lib/erp/auth";
import { loadParties, loadProducts, loadPromotions } from "@/lib/erp/data";
import { saveSalesOrder } from "../actions";

export const metadata = { title: "New sales order" };

const id = (v?: string) => (v && Number(v) > 0 ? Number(v) : null);

export default async function NewSalesOrderPage({ searchParams }: { searchParams: Promise<{ type?: string; sr?: string; dsr?: string; retailer?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireErp();
  const [products, parties, promos] = await Promise.all([loadProducts(supabase), loadParties(supabase), loadPromotions(supabase, "sales", today())]);
  const withPromo = products.map((p) => ({ ...p, promo: promos.byProduct.get(p.id) ?? null }));
  return <SalesOrderForm products={withPromo} {...parties} orderWideOffers={promos.orderWide} onSave={saveSalesOrder} dataNote="Live stock · FIFO lots"
      prefill={{ type: sp.type === "direct" || sp.type === "return" ? sp.type : sp.type === "dsr" ? "dsr" : undefined, srId: id(sp.sr), dsrId: id(sp.dsr), retailerId: id(sp.retailer) }}
    />;
}
