import Link from "next/link";
import { requireStaff } from "@/lib/admin/auth";
import { loadOptions } from "@/lib/erp/data";
import { margin } from "@/lib/erp/people";
import { ButtonLink, DataTable, FilterBar, PageHeader, fieldCls, labelCls, money, qty } from "@/components/erp/ui";

export const metadata = { title: "Stock" };

type Row = { id: number; name: string; category: string | null; supplier: string | null; per: number; buy_price: number; sale_price: number; min_stock: number; stock: number; value: number; damaged_unclaimed: number };

export default async function StockPage({ searchParams }: { searchParams: Promise<{ q?: string; supplier?: string; category?: string; low?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireStaff();
  let query = supabase.from("erp_stock_list").select("*").eq("active", true).order("name");
  if (sp.supplier) query = query.eq("supplier_id", sp.supplier);
  if (sp.category) query = query.eq("category_id", sp.category);
  if (sp.q) query = query.ilike("name", `%${sp.q.replace(/[%,()]/g, " ")}%`);
  const [{ data }, opts] = await Promise.all([query, loadOptions(supabase, ["suppliers", "categories"])]);
  let rows = (data ?? []) as Row[];
  if (sp.low) rows = rows.filter((r) => Number(r.stock) <= Number(r.min_stock));
  const totalValue = rows.reduce((s, r) => s + Number(r.value), 0);
  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader eyebrow="Stock" title={sp.low ? "Low stock" : "Stock"}>
        <ButtonLink href="/admin/business/stock/adjust" variant="outline">Adjust & damage</ButtonLink>
      </PageHeader>
      <FilterBar>
        <label><span className={labelCls}>Search</span><input name="q" defaultValue={sp.q ?? ""} className={fieldCls} /></label>
        <label><span className={labelCls}>Supplier</span><select name="supplier" defaultValue={sp.supplier ?? ""} className={fieldCls}><option value="">All</option>{opts.suppliers.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
        <label><span className={labelCls}>Category</span><select name="category" defaultValue={sp.category ?? ""} className={fieldCls}><option value="">All</option>{opts.categories.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
        <label className="flex items-center gap-2 pb-2 text-sm font-semibold"><input type="checkbox" name="low" value="1" defaultChecked={!!sp.low} className="size-4 accent-forest-700" /> Low stock only</label>
      </FilterBar>
      <p className="mb-3 text-sm text-ink-600">{rows.length} products · stock value at cost <b className="text-forest-800">{money(totalValue)}</b></p>
      <DataTable
        rows={rows}
        empty="No products match."
        cols={[
          { label: "Product", get: (r) => <Link href={`/admin/business/stock/${r.id}`} className="font-semibold text-forest-800 hover:underline">{r.name}</Link> },
          { label: "Category", get: (r) => r.category ?? "—" },
          { label: "Supplier", get: (r) => r.supplier ?? "—" },
          { label: "Buy", right: true, get: (r) => money(r.buy_price) },
          { label: "Sale", right: true, get: (r) => money(r.sale_price) },
          { label: "Margin", right: true, get: (r) => `${margin(Number(r.buy_price), Number(r.sale_price)).toFixed(2)}%` },
          { label: "Stock (pcs)", right: true, get: (r) => <span className={Number(r.stock) <= 0 ? "font-bold text-red-600" : Number(r.stock) <= Number(r.min_stock) ? "font-bold text-amber-600" : "font-bold"}>{qty(r.stock)}</span> },
          { label: "Cartons", right: true, get: (r) => `${Math.floor(Number(r.stock) / r.per)} + ${qty(Number(r.stock) % r.per)}` },
          { label: "Value", right: true, get: (r) => money(r.value) },
          { label: "Damaged", right: true, get: (r) => (Number(r.damaged_unclaimed) ? qty(r.damaged_unclaimed) : "—") },
        ]}
        foot={["Total", "", "", "", "", "", qty(rows.reduce((s, r) => s + Number(r.stock), 0)), "", money(totalValue), ""]}
      />
    </div>
  );
}
