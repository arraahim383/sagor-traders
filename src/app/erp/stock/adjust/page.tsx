import { SubmitButton } from "@/components/admin/ui";
import { Card, DataTable, Notice, PageHeader, dateLabel, fieldCls, labelCls, money, qty, today } from "@/components/erp/ui";
import { requireErp } from "@/lib/erp/auth";
import { saveStockAction } from "../actions";

export const metadata = { title: "Stock adjust & damage" };

const ACTIONS = [
  { value: "increase", label: "Increase stock (found / correction)" },
  { value: "decrease", label: "Decrease stock (lost / correction)" },
  { value: "damage", label: "Record damage (out of sellable stock)" },
  { value: "reduce", label: "Reduce damage (correction, back to stock)" },
  { value: "recover", label: "Damage recovered (repaired, back to stock)" },
];

export default async function StockAdjustPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; mode?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireErp();
  const [{ data: products }, { data: adj }, { data: dmg }] = await Promise.all([
    supabase.from("erp_stock_list").select("id, name, stock").eq("active", true).order("name"),
    supabase.from("erp_stock_adjustments").select("adj_no, date, direction, qty, amount, reason, product:erp_products(name)").order("id", { ascending: false }).limit(50),
    supabase.from("erp_damage_notes").select("note_no, date, kind, qty, amount, remark, product:erp_products(name)").order("id", { ascending: false }).limit(50),
  ]);
  type H = { no: string; date: string; what: string; qty: number; amount: number; reason: string | null; product: string };
  const history: H[] = [
    ...((adj ?? []) as unknown as { adj_no: string; date: string; direction: string; qty: number; amount: number; reason: string | null; product: { name: string } }[]).map((a) => ({ no: a.adj_no, date: a.date, what: a.direction === "in" ? "Increase" : "Decrease", qty: a.qty, amount: a.amount, reason: a.reason, product: a.product.name })),
    ...((dmg ?? []) as unknown as { note_no: string; date: string; kind: string; qty: number; amount: number; remark: string | null; product: { name: string } }[]).map((d) => ({ no: d.note_no, date: d.date, what: d.kind === "damage" ? "Damage" : d.kind === "reduce" ? "Damage reduced" : "Damage recovered", qty: d.qty, amount: d.amount, reason: d.remark, product: d.product.name })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="Stock" title="Adjust & damage" />
      {sp.saved && <Notice tone="ok">{sp.saved}</Notice>}
      {sp.error && <Notice tone="error">{sp.error}</Notice>}
      <Card className="mb-6">
        <form action={saveStockAction} className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className={labelCls}>Product</span>
            <select name="product_id" required className={fieldCls}>
              <option value="">— Select product —</option>
              {(products ?? []).map((p) => <option key={p.id} value={p.id}>{p.name} (stock {qty(p.stock)})</option>)}
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className={labelCls}>What happened</span>
            <select name="action" defaultValue={ACTIONS.some((a) => a.value === sp.mode) ? sp.mode : undefined} className={fieldCls}>{ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}</select>
          </label>
          <label><span className={labelCls}>Quantity (pcs)</span><input type="number" name="qty" min="0.001" step="any" required className={fieldCls} /></label>
          <label><span className={labelCls}>Rate (optional)</span><input type="number" name="rate" min="0" step="any" placeholder="Auto: FIFO cost / buy price" className={fieldCls} /></label>
          <label><span className={labelCls}>Date</span><input type="date" name="date" defaultValue={today()} className={fieldCls} /></label>
          <label><span className={labelCls}>Reason</span><input name="reason" className={fieldCls} /></label>
          <p className="text-xs text-ink-400 sm:col-span-2">Stock going out is always valued at its real FIFO cost. Damaged stock becomes claimable from the supplier under Claims.</p>
          <div className="sm:col-span-2"><SubmitButton>Save</SubmitButton></div>
        </form>
      </Card>
      <DataTable
        rows={history}
        empty="No adjustments yet."
        cols={[
          { label: "Date", get: (h) => dateLabel(h.date) },
          { label: "No.", get: (h) => h.no },
          { label: "Product", get: (h) => h.product },
          { label: "What", get: (h) => h.what },
          { label: "Qty", right: true, get: (h) => qty(h.qty) },
          { label: "Value", right: true, get: (h) => money(h.amount) },
          { label: "Reason", get: (h) => h.reason ?? "—" },
        ]}
      />
    </div>
  );
}
