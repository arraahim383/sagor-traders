import { SubmitButton } from "@/components/admin/ui";
import { Card, DataTable, Notice, PageHeader, Stat, dateLabel, fieldCls, labelCls, money, today } from "@/components/erp/ui";
import { requireErp } from "@/lib/erp/auth";
import { loadRetailers, selectAll } from "@/lib/erp/data";
import { allowanceEstimate } from "@/lib/erp/people";
import { saveBadDebt } from "../accounts/actions";

export const metadata = { title: "Bad debts" };

export default async function BadDebtsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; percent?: string; mode?: string; fixed?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireErp();
  const [parties, { data: allowance }, { data: history }, retailers, stf] = await Promise.all([
    selectAll<{ party_type: string; party_id: number; balance: number }>((a, b) =>
      supabase.from("erp_party_balances").select("party_type, party_id, balance").in("party_type", ["retailer", "sr", "dsr"]).gt("balance", 0).order("party_type").order("party_id").range(a, b),
    ),
    supabase.from("erp_account_balances").select("balance").eq("code", "1370").maybeSingle(),
    supabase.from("erp_bad_debts").select("*").order("id", { ascending: false }).limit(100),
    loadRetailers(supabase, true),
    supabase.from("erp_staff").select("id, name"),
  ]);
  const ret = { data: retailers };
  const receivables = (parties ?? []).reduce((s, p) => s + Number(p.balance), 0);
  const current = -Number(allowance?.balance ?? 0);
  const percent = Number(sp.percent ?? 2);
  // Rushda: target as a percent of total receivables (default 2%) or a fixed amount.
  const mode = sp.mode === "fixed" ? "fixed" : "percent";
  const fixed = Number(sp.fixed ?? 0);
  const est = allowanceEstimate(receivables, mode, mode === "fixed" ? fixed : percent, current);
  const nameOf = (t: string, id: number) => (t === "retailer" ? (ret.data ?? []).find((r) => r.id === id)?.name : (stf.data ?? []).find((s) => s.id === id)?.name) ?? `#${id}`;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="Accounts" title="Allowance for bad debts" />
      {sp.saved && <Notice tone="ok">{sp.saved}</Notice>}
      {sp.error && <Notice tone="error">{sp.error}</Notice>}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Total receivables" value={money(receivables)} tone="dark" />
        <Stat label="Current allowance" value={money(current)} />
        <Stat label={mode === "fixed" ? "Fixed target" : `Target at ${percent}%`} value={money(est.target)} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Record allowance estimate">
          <form method="get" className="mb-3 flex flex-wrap items-end gap-2">
            <label><span className={labelCls}>Target by</span>
              <select name="mode" defaultValue={mode} className={fieldCls}><option value="percent">% of receivables</option><option value="fixed">Fixed amount</option></select>
            </label>
            <label><span className={labelCls}>Percent</span><input type="number" name="percent" step="any" defaultValue={percent} className={fieldCls} /></label>
            <label><span className={labelCls}>Fixed (৳)</span><input type="number" name="fixed" step="any" defaultValue={fixed || ""} className={fieldCls} /></label>
            <button className="rounded-full border-2 border-forest-800 px-4 py-2 text-sm font-bold text-forest-800">Recalculate</button>
          </form>
          <form action={saveBadDebt} className="space-y-3">
            <input type="hidden" name="kind" value="estimate" />
            <label className="block"><span className={labelCls}>Adjustment to post (target − current)</span><input type="number" name="adjustment" step="any" defaultValue={est.adjustment} className={fieldCls} /></label>
            <label className="block"><span className={labelCls}>Date</span><input type="date" name="date" defaultValue={today()} className={fieldCls} /></label>
            <label className="block"><span className={labelCls}>Note</span><input name="note" className={fieldCls} /></label>
            <SubmitButton>Post estimate</SubmitButton>
          </form>
        </Card>
        <Card title="Write off a receivable">
          <form action={saveBadDebt} className="space-y-3">
            <input type="hidden" name="kind" value="writeoff" />
            <label className="block"><span className={labelCls}>Party (only those who owe money)</span>
              <select name="party" required className={fieldCls}>
                <option value="">— Select —</option>
                {(parties ?? []).map((p) => <option key={`${p.party_type}:${p.party_id}`} value={`${p.party_type}:${p.party_id}`}>{p.party_type.toUpperCase()} · {nameOf(p.party_type, Number(p.party_id))} — {money(p.balance)}</option>)}
              </select>
            </label>
            <label className="block"><span className={labelCls}>Amount to write off</span><input type="number" name="amount" min="0.01" step="any" required className={fieldCls} /></label>
            <label className="block"><span className={labelCls}>Date</span><input type="date" name="date" defaultValue={today()} className={fieldCls} /></label>
            <label className="block"><span className={labelCls}>Note</span><input name="note" className={fieldCls} /></label>
            <SubmitButton>Write off</SubmitButton>
          </form>
        </Card>
      </div>
      <h2 className="mb-3 mt-8 text-lg font-extrabold">History</h2>
      <DataTable
        rows={history ?? []}
        empty="Nothing recorded yet."
        cols={[
          { label: "Date", get: (r) => dateLabel(r.date) },
          { label: "Voucher", get: (r) => r.voucher_no },
          { label: "Type", get: (r) => (r.kind === "estimate" ? "Allowance" : "Write-off") },
          { label: "Party", get: (r) => (r.party_type ? `${r.party_type.toUpperCase()} · ${nameOf(r.party_type, r.party_id)}` : "—") },
          { label: "Amount", right: true, get: (r) => money(r.amount) },
          { label: "Note", get: (r) => r.note ?? "—" },
        ]}
      />
    </div>
  );
}
