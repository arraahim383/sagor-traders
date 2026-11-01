import Link from "next/link";
import { DataTable, money, qty } from "@/components/erp/ui";
import { n, rows, total, type Ctx } from "./shared";

type S = { id: number; name: string; category: string | null; supplier: string | null; per: number; stock: number; value: number; buy_price: number; sale_price: number; min_stock: number; damaged_unclaimed: number };
type Free = { product_id: number; product: string; received: number; given: number };

export const STOCK_KEYS = ["stock-value", "low-stock", "free-stock", "damage-stock"];

const productLink = (id: number, name: string) => <Link href={`/erp/stock/${id}`} className="font-bold text-forest-800 hover:underline">{name}</Link>;
const cartons = (stock: number, per: number) => (per > 0 ? `${Math.floor(stock / per)} / ${qty(stock - Math.floor(stock / per) * per)}` : qty(stock));

export async function StockReport(c: Ctx) {
  if (c.key === "free-stock") {
    const data = rows<Free>(await c.supabase.rpc("erp_rpt_free_stock"));
    return (
      <DataTable
        rows={data}
        empty="No free goods received or given yet."
        cols={[
          { label: "Product", get: (r) => productLink(r.product_id, r.product) },
          { label: "Free received (GRN)", right: true, get: (r) => qty(r.received) },
          { label: "Free given (sales)", right: true, get: (r) => qty(r.given) },
          { label: "Current free stock", right: true, get: (r) => <b>{qty(n(r.received) - n(r.given))}</b> },
        ]}
        foot={["Total", qty(total(data, (r) => n(r.received))), qty(total(data, (r) => n(r.given))), qty(total(data, (r) => n(r.received) - n(r.given)))]}
      />
    );
  }
  const all = rows<S>(await c.supabase.from("erp_stock_list").select("*").eq("active", true).order("name"));
  if (c.key === "damage-stock") {
    const data = all.filter((r) => n(r.damaged_unclaimed) > 0);
    return (
      <DataTable
        rows={data}
        empty="No unclaimed damage."
        cols={[
          { label: "Product", get: (r) => productLink(r.id, r.name) },
          { label: "Supplier", get: (r) => r.supplier ?? "—" },
          { label: "Damaged, unclaimed", right: true, get: (r) => qty(r.damaged_unclaimed) },
          { label: "At buy price", right: true, get: (r) => money(n(r.damaged_unclaimed) * n(r.buy_price)) },
        ]}
        foot={["Total", "", qty(total(data, (r) => n(r.damaged_unclaimed))), money(total(data, (r) => n(r.damaged_unclaimed) * n(r.buy_price)))]}
      />
    );
  }
  const data = c.key === "low-stock" ? all.filter((r) => n(r.stock) <= n(r.min_stock)) : all;
  return (
    <DataTable
      rows={data}
      empty={c.key === "low-stock" ? "Nothing at or below its minimum stock." : "No products."}
      cols={[
        { label: "Product", get: (r) => productLink(r.id, r.name) },
        { label: "Category", get: (r) => r.category ?? "—" },
        { label: "Supplier", get: (r) => r.supplier ?? "—" },
        { label: "Stock (pcs)", right: true, get: (r) => <b className={n(r.stock) <= 0 ? "text-red-600" : n(r.stock) < 10 ? "text-amber-700" : ""}>{qty(r.stock)}</b> },
        { label: "Carton / pcs", right: true, get: (r) => cartons(n(r.stock), n(r.per)) },
        { label: "Min stock", right: true, get: (r) => qty(r.min_stock) },
        { label: "Value (FIFO cost)", right: true, get: (r) => money(r.value) },
        { label: "Sale value", right: true, get: (r) => money(n(r.stock) * n(r.sale_price)) },
      ]}
      foot={["Total", "", "", qty(total(data, (r) => n(r.stock))), "", "", money(total(data, (r) => n(r.value))), money(total(data, (r) => n(r.stock) * n(r.sale_price)))]}
    />
  );
}
