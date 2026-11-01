import { DataTable, FilterBar, PageHeader, dateLabel, fieldCls, labelCls, money, monthStart, today } from "@/components/erp/ui";
import { requireErp } from "@/lib/erp/auth";
import { selectAll } from "@/lib/erp/data";

export const metadata = { title: "Transaction list" };

type Entry = { id: number; voucher_no: string; date: string; kind: string; amount: number; direction: string | null; description: string | null; ref_no: string | null; account: { name: string }; to: { name: string } | null; category: { name: string } | null };

const received = (r: Entry) => (r.kind === "receive" || (r.kind === "adjustment" && r.direction === "increase") ? Number(r.amount) : 0);
const paid = (r: Entry) => (r.kind === "payment" || r.kind === "transfer" || (r.kind === "adjustment" && r.direction === "decrease") ? Number(r.amount) : 0);

export default async function TransactionList({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; account?: string; category?: string; kind?: string }> }) {
  const sp = await searchParams;
  const from = sp.from || monthStart();
  const to = sp.to || today();
  const { supabase } = await requireErp();
  const [{ data: accounts }, { data: cats }, rows] = await Promise.all([
    supabase.from("erp_accounts").select("id, name").eq("is_cash", true).order("code"),
    supabase.from("erp_cash_categories").select("id, name").order("name"),
    selectAll<Entry>((a, b) => {
      let q = supabase
        .from("erp_cash_entries")
        .select("id, voucher_no, date, kind, amount, direction, description, ref_no, account:erp_accounts!erp_cash_entries_account_id_fkey(name), to:erp_accounts!erp_cash_entries_to_account_id_fkey(name), category:erp_cash_categories(name)")
        .gte("date", from)
        .lte("date", to);
      if (sp.account) q = q.eq("account_id", sp.account);
      if (sp.category) q = q.eq("category_id", sp.category);
      if (sp.kind) q = q.eq("kind", sp.kind);
      return q.order("date").order("id").range(a, b) as never;
    }),
  ]);
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Transaction" title="Transaction list" />
      <FilterBar>
        <label><span className={labelCls}>From</span><input type="date" name="from" defaultValue={from} className={fieldCls} /></label>
        <label><span className={labelCls}>To</span><input type="date" name="to" defaultValue={to} className={fieldCls} /></label>
        <label><span className={labelCls}>Account</span><select name="account" defaultValue={sp.account ?? ""} className={fieldCls}><option value="">All</option>{(accounts ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label><span className={labelCls}>Category</span><select name="category" defaultValue={sp.category ?? ""} className={fieldCls}><option value="">All</option>{(cats ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label><span className={labelCls}>Type</span>
          <select name="kind" defaultValue={sp.kind ?? ""} className={fieldCls}><option value="">All</option><option value="receive">Receive</option><option value="payment">Payment</option><option value="transfer">Transfer</option><option value="adjustment">Adjustment</option></select>
        </label>
      </FilterBar>
      <DataTable
        rows={rows}
        empty="No transactions match."
        cols={[
          { label: "Date", get: (r) => dateLabel(r.date) },
          { label: "Voucher", get: (r) => <b>{r.voucher_no}</b> },
          { label: "Category", get: (r) => r.category?.name ?? (r.kind === "transfer" ? `→ ${r.to?.name}` : r.direction ?? "—") },
          { label: "Type", get: (r) => r.kind },
          { label: "Description", get: (r) => r.description ?? "—" },
          { label: "Account", get: (r) => r.account.name },
          { label: "Received", right: true, get: (r) => (received(r) ? money(received(r)) : "") },
          { label: "Paid", right: true, get: (r) => (paid(r) ? money(paid(r)) : "") },
        ]}
        foot={["Total", "", "", "", "", "", money(rows.reduce((s, r) => s + received(r), 0)), money(rows.reduce((s, r) => s + paid(r), 0))]}
      />
    </div>
  );
}
