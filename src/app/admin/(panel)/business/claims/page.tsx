import { SubmitButton } from "@/components/admin/ui";
import { Badge, Card, DataTable, Notice, PageHeader, cellCls, dateLabel, fieldCls, labelCls, money, qty, today } from "@/components/erp/ui";
import { requireStaff } from "@/lib/admin/auth";
import { createClaim, receiveClaim } from "./actions";

export const metadata = { title: "Claims" };

type Claim = { id: number; claim_no: string; date: string; type: string; period_from: string | null; period_to: string | null; claimed: number; received: number; status: string; remark: string | null; supplier: { name: string } };

export default async function ClaimsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; supplier?: string; status?: string; amount?: string; from?: string; to?: string; kind?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireStaff();
  const kind = sp.kind ?? "Damage";
  let cq = supabase.from("erp_claims").select("*, supplier:erp_suppliers(name)").order("id", { ascending: false });
  if (sp.status !== "all") cq = cq.eq("status", sp.status === "settled" ? "Settled" : "Outstanding");
  const [{ data: claims }, { data: suppliers }, damaged] = await Promise.all([
    cq,
    supabase.from("erp_suppliers").select("id, name").order("name"),
    sp.supplier && kind === "Damage"
      ? supabase.from("erp_stock_list").select("id, name, buy_price, damaged_unclaimed").eq("supplier_id", sp.supplier).gt("damaged_unclaimed", 0).order("name")
      : Promise.resolve({ data: [] as { id: number; name: string; buy_price: number; damaged_unclaimed: number }[] }),
  ]);
  const rows = (claims ?? []) as Claim[];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Stock" title="Claims on suppliers" />
      {sp.saved && <Notice tone="ok">{sp.saved}</Notice>}
      {sp.error && <Notice tone="error">{sp.error}</Notice>}

      <Card title="New claim" className="mb-6">
        <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
          <label><span className={labelCls}>Claim type</span>
            <select name="kind" defaultValue={kind} className={fieldCls}>
              <option value="Damage">Damage claim (from damaged stock)</option>
              <option value="Rate Difference">Rate difference</option>
              <option value="General">General / cash claim</option>
            </select>
          </label>
          <label><span className={labelCls}>Supplier</span>
            <select name="supplier" defaultValue={sp.supplier ?? ""} className={fieldCls}>
              <option value="">— Select —</option>
              {(suppliers ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <button className="rounded-full border-2 border-forest-800 px-4 py-2 text-sm font-bold text-forest-800">Load</button>
        </form>

        {sp.supplier && (
          <form action={createClaim} className="space-y-4">
            <input type="hidden" name="supplier_id" value={sp.supplier} />
            <input type="hidden" name="type" value={kind} />
            {kind === "Damage" ? (
              (damaged.data ?? []).length === 0 ? (
                <p className="text-sm text-ink-600">No unclaimed damaged stock for this supplier.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-[11px] font-bold uppercase tracking-wider text-ink-600">
                      <tr><th className="py-2">Item</th><th className="py-2 text-right">Available</th><th className="py-2 text-center">Claim qty</th><th className="py-2 text-center">Price</th></tr>
                    </thead>
                    <tbody className="divide-y divide-ink-900/5">
                      {(damaged.data ?? []).map((d) => (
                        <tr key={d.id}>
                          <td className="py-2 font-semibold">{d.name}</td>
                          <td className="py-2 text-right">{qty(d.damaged_unclaimed)}</td>
                          <td className="py-2 text-center"><input type="number" name={`qty_${d.id}`} min={0} max={Number(d.damaged_unclaimed)} step="any" defaultValue={Number(d.damaged_unclaimed)} className={cellCls} /></td>
                          <td className="py-2 text-center"><input type="number" name={`price_${d.id}`} min={0} step="any" defaultValue={Number(d.buy_price)} className={`${cellCls} w-24`} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                <label><span className={labelCls}>Claim amount</span><input type="number" name="amount" min="0.01" step="any" defaultValue={sp.amount ?? ""} required className={fieldCls} /></label>
                {kind === "Rate Difference" ? (
                  <>
                    <label><span className={labelCls}>Period from</span><input type="date" name="period_from" defaultValue={sp.from ?? ""} className={fieldCls} /></label>
                    <label><span className={labelCls}>Period to</span><input type="date" name="period_to" defaultValue={sp.to ?? ""} className={fieldCls} /></label>
                  </>
                ) : (
                  <label><span className={labelCls}>Paid now (cash)</span><input type="number" name="paid" min="0" step="any" placeholder="0" className={fieldCls} /></label>
                )}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <label><span className={labelCls}>Date</span><input type="date" name="date" defaultValue={today()} className={fieldCls} /></label>
              <label className="sm:col-span-2"><span className={labelCls}>Remark</span><input name="remark" defaultValue={kind === "Rate Difference" && sp.from ? `Rate difference ${sp.from} - ${sp.to}` : ""} className={fieldCls} /></label>
            </div>
            <SubmitButton>Send claim</SubmitButton>
          </form>
        )}
      </Card>

      <form method="get" className="mb-3 flex items-center gap-2 text-sm">
        <span className="font-bold text-ink-600">Show</span>
        {[["", "Outstanding"], ["settled", "Settled"], ["all", "All"]].map(([v, l]) => (
          <button key={v} name="status" value={v} className={`rounded-full px-3 py-1 font-bold ${(sp.status ?? "") === v ? "bg-lime-200 text-forest-950" : "bg-white shadow-card"}`}>{l}</button>
        ))}
      </form>
      <DataTable
        rows={rows}
        empty="No claims."
        cols={[
          { label: "Claim", get: (r) => <b>{r.claim_no}</b> },
          { label: "Date", get: (r) => dateLabel(r.date) },
          { label: "Supplier", get: (r) => r.supplier.name },
          { label: "Type", get: (r) => r.type },
          { label: "Period", get: (r) => (r.period_from ? `${dateLabel(r.period_from)} – ${dateLabel(r.period_to)}` : "—") },
          { label: "Claimed", right: true, get: (r) => money(r.claimed) },
          { label: "Received", right: true, get: (r) => money(r.received) },
          { label: "Due", right: true, get: (r) => <b>{money(Number(r.claimed) - Number(r.received))}</b> },
          { label: "Status", get: (r) => <Badge tone={r.status === "Settled" ? "lime" : "amber"}>{r.status}</Badge> },
          {
            label: "Receive",
            get: (r) =>
              r.status === "Settled" ? null : (
                <form action={receiveClaim.bind(null, r.id)} className="flex flex-wrap items-center gap-1">
                  <input type="number" name="amount" step="any" defaultValue={(Number(r.claimed) - Number(r.received)).toFixed(2)} className={`${cellCls} w-24`} />
                  <input type="hidden" name="date" value={today()} />
                  <select name="account" className="rounded-lg border border-ink-900/10 px-1 py-1 text-xs"><option value="cash">Cash</option><option value="bank">Bank</option><option value="bkash">bKash</option><option value="nagad">Nagad</option></select>
                  <select name="mode" className="rounded-lg border border-ink-900/10 px-1 py-1 text-xs"><option>Cash</option><option>Bank Transfer</option><option>Mobile Banking</option><option>Adjustment</option></select>
                  <button className="rounded-lg bg-forest-900 px-2 py-1 text-xs font-bold text-white">Receive</button>
                </form>
              ),
          },
        ]}
      />
    </div>
  );
}
