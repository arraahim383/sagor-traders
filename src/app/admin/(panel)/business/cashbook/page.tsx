import { SubmitButton } from "@/components/admin/ui";
import { Card, DataTable, FilterBar, Notice, PageHeader, Stat, dateLabel, fieldCls, labelCls, money, monthStart, today } from "@/components/erp/ui";
import { requireStaff } from "@/lib/admin/auth";
import { saveCashEntry } from "./actions";

export const metadata = { title: "Cash book" };

type Entry = { id: number; voucher_no: string; date: string; kind: string; amount: number; direction: string | null; description: string | null; ref_no: string | null; account: { name: string }; to: { name: string } | null; category: { name: string } | null };
const TABS = [
  { k: "payment", label: "Expense / payment" },
  { k: "receive", label: "Income / receive" },
  { k: "transfer", label: "Transfer" },
  { k: "adjustment", label: "Adjustment" },
];

export default async function CashBookPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; kind?: string; from?: string; to?: string }> }) {
  const sp = await searchParams;
  const kind = TABS.some((t) => t.k === sp.kind) ? sp.kind! : "payment";
  const from = sp.from || monthStart();
  const to = sp.to || today();
  const { supabase } = await requireStaff();
  const [{ data: accounts }, { data: cats }, { data: entries }, { data: bal }] = await Promise.all([
    supabase.from("erp_accounts").select("id, name").eq("is_cash", true).eq("active", true).order("code"),
    supabase.from("erp_cash_categories").select("id, name, kind").order("name"),
    supabase.from("erp_cash_entries").select("*, account:erp_accounts!erp_cash_entries_account_id_fkey(name), to:erp_accounts!erp_cash_entries_to_account_id_fkey(name), category:erp_cash_categories(name)").gte("date", from).lte("date", to).order("id", { ascending: false }),
    supabase.from("erp_account_balances").select("name, balance").eq("is_cash", true).order("code"),
  ]);
  const rows = (entries ?? []) as unknown as Entry[];
  const catOpts = (cats ?? []).filter((c) => (kind === "payment" ? c.kind === "expense" : kind === "receive" ? c.kind === "income" : false));
  const acctSelect = (name: string, label: string) => (
    <label><span className={labelCls}>{label}</span>
      <select name={name} required className={fieldCls}>{(accounts ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
    </label>
  );

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Payments" title="Cash book" />
      {sp.saved && <Notice tone="ok">{sp.saved}</Notice>}
      {sp.error && <Notice tone="error">{sp.error}</Notice>}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(bal ?? []).map((b) => <Stat key={b.name} label={b.name} value={money(b.balance)} />)}
      </div>
      <Card className="mb-6">
        <div className="no-scrollbar mb-4 flex gap-1.5 overflow-x-auto">
          {TABS.map((t) => (
            <a key={t.k} href={`?kind=${t.k}`} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${t.k === kind ? "bg-forest-900 text-white" : "bg-mint-50 text-ink-600"}`}>{t.label}</a>
          ))}
        </div>
        <form action={saveCashEntry} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="kind" value={kind} />
          <label><span className={labelCls}>Date</span><input type="date" name="date" defaultValue={today()} className={fieldCls} /></label>
          {acctSelect("account_id", kind === "transfer" ? "From account" : "Account")}
          {kind === "transfer" && acctSelect("to_account_id", "To account")}
          {(kind === "payment" || kind === "receive") && (
            <label><span className={labelCls}>Category</span>
              <select name="category_id" required className={fieldCls}><option value="">—</option>{catOpts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            </label>
          )}
          {kind === "adjustment" && (
            <label><span className={labelCls}>Direction</span><select name="direction" className={fieldCls}><option value="increase">Increase</option><option value="decrease">Decrease</option></select></label>
          )}
          <label><span className={labelCls}>Amount</span><input type="number" name="amount" min="0.01" step="any" required className={fieldCls} /></label>
          <label><span className={labelCls}>Voucher / ref no.</span><input name="ref_no" className={fieldCls} /></label>
          <label className="sm:col-span-2"><span className={labelCls}>Description</span><input name="description" className={fieldCls} /></label>
          <div className="flex items-end"><SubmitButton>Save</SubmitButton></div>
        </form>
      </Card>
      <FilterBar>
        <input type="hidden" name="kind" value={kind} />
        <label><span className={labelCls}>From</span><input type="date" name="from" defaultValue={from} className={fieldCls} /></label>
        <label><span className={labelCls}>To</span><input type="date" name="to" defaultValue={to} className={fieldCls} /></label>
      </FilterBar>
      <DataTable
        rows={rows}
        empty="No entries in this period."
        cols={[
          { label: "Date", get: (r) => dateLabel(r.date) },
          { label: "Voucher", get: (r) => <b>{r.voucher_no}</b> },
          { label: "Type", get: (r) => r.kind },
          { label: "Category", get: (r) => r.category?.name ?? (r.kind === "transfer" ? `→ ${r.to?.name}` : r.direction ?? "—") },
          { label: "Description", get: (r) => r.description ?? "—" },
          { label: "Account", get: (r) => r.account.name },
          { label: "Received", right: true, get: (r) => (r.kind === "receive" || (r.kind === "adjustment" && r.direction === "increase") ? money(r.amount) : "") },
          { label: "Paid", right: true, get: (r) => (r.kind === "payment" || r.kind === "transfer" || (r.kind === "adjustment" && r.direction === "decrease") ? money(r.amount) : "") },
        ]}
      />
    </div>
  );
}
