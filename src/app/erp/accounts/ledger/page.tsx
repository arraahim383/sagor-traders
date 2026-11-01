import { requireErp } from "@/lib/erp/auth";
import { selectAll } from "@/lib/erp/data";
import { DataTable, FilterBar, PageHeader, dateLabel, fieldCls, labelCls, money, monthStart, today } from "@/components/erp/ui";

export const metadata = { title: "Ledger" };

type L = { line_id: number; debit: number; credit: number; party_type: string | null; date: string; voucher_no: string; narration: string | null };

export default async function LedgerPage({ searchParams }: { searchParams: Promise<{ account?: string; from?: string; to?: string }> }) {
  const sp = await searchParams;
  const from = sp.from || monthStart();
  const to = sp.to || today();
  const { supabase } = await requireErp();
  const { data: accounts } = await supabase.from("erp_accounts").select("id, code, name").order("code");
  const account = (accounts ?? []).find((a) => String(a.id) === sp.account);
  let rows: (L & { balance: number })[] = [];
  let opening = 0;
  if (account) {
    const [{ data: acc }, lines] = await Promise.all([
      supabase.rpc("erp_rpt_accounts", { p_from: from, p_to: to }).eq("id", account.id).maybeSingle(),
      selectAll<L>((a, b) => supabase.rpc("erp_rpt_account_ledger", { p_account: account.id, p_from: from, p_to: to }).range(a, b) as never),
    ]);
    opening = Number((acc as { opening?: number } | null)?.opening ?? 0);
    let bal = opening;
    rows = lines.map((l) => ({ ...l, balance: (bal += Number(l.debit) - Number(l.credit)) }));
  }
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="Accounts" title={account ? `Ledger · ${account.code} ${account.name}` : "Ledger"} />
      <FilterBar>
        <label><span className={labelCls}>Account</span>
          <select name="account" defaultValue={sp.account ?? ""} className={fieldCls}>
            <option value="">— Select —</option>
            {(accounts ?? []).map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
          </select>
        </label>
        <label><span className={labelCls}>From</span><input type="date" name="from" defaultValue={from} className={fieldCls} /></label>
        <label><span className={labelCls}>To</span><input type="date" name="to" defaultValue={to} className={fieldCls} /></label>
      </FilterBar>
      {account && (
        <>
          <p className="mb-3 text-sm text-ink-600">Opening balance <b>{money(opening)}</b> (debit positive)</p>
          <DataTable
            rows={rows}
            empty="No entries in this period."
            cols={[
              { label: "Date", get: (r) => dateLabel(r.date) },
              { label: "Voucher", get: (r) => <b>{r.voucher_no}</b> },
              { label: "Narration", get: (r) => r.narration ?? "—" },
              { label: "Debit", right: true, get: (r) => (Number(r.debit) ? money(r.debit) : "") },
              { label: "Credit", right: true, get: (r) => (Number(r.credit) ? money(r.credit) : "") },
              { label: "Balance", right: true, get: (r) => <b>{money(r.balance)}</b> },
            ]}
            foot={["", "", "Total", money(rows.reduce((s, r) => s + Number(r.debit), 0)), money(rows.reduce((s, r) => s + Number(r.credit), 0)), money(rows.at(-1)?.balance ?? opening)]}
          />
        </>
      )}
    </div>
  );
}
