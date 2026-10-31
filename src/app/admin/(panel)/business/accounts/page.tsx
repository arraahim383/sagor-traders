import Link from "next/link";
import { SubmitButton } from "@/components/admin/ui";
import { Card, DataTable, Notice, PageHeader, fieldCls, labelCls, money } from "@/components/erp/ui";
import { requireStaff } from "@/lib/admin/auth";
import { addAccount } from "./actions";

export const metadata = { title: "Chart of accounts" };

type A = { id: number; code: string; name: string; type: string; is_cash: boolean; balance: number };

export default async function AccountsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireStaff();
  const { data } = await supabase.from("erp_account_balances").select("*").order("code");
  const rows = (data ?? []) as A[];
  const debit = rows.reduce((s, r) => s + Math.max(0, Number(r.balance)), 0);
  const credit = rows.reduce((s, r) => s + Math.max(0, -Number(r.balance)), 0);
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="Accounts" title="Chart of accounts" />
      {sp.saved && <Notice tone="ok">{sp.saved}</Notice>}
      {sp.error && <Notice tone="error">{sp.error}</Notice>}
      <DataTable
        rows={rows}
        cols={[
          { label: "Code", get: (r) => r.code },
          { label: "Account", get: (r) => <Link href={`/admin/business/accounts/ledger?account=${r.id}`} className="font-semibold text-forest-800 hover:underline">{r.name}</Link> },
          { label: "Type", get: (r) => r.type },
          { label: "Cash/Bank", get: (r) => (r.is_cash ? "Yes" : "") },
          { label: "Debit", right: true, get: (r) => (Number(r.balance) > 0 ? money(r.balance) : "") },
          { label: "Credit", right: true, get: (r) => (Number(r.balance) < 0 ? money(-r.balance) : "") },
        ]}
        foot={["", "Total (trial balance)", "", "", money(debit), money(credit)]}
      />
      <Card title="Add an account" className="mt-6">
        <form action={addAccount} className="grid gap-4 sm:grid-cols-3">
          <label><span className={labelCls}>Account name</span><input name="name" required className={fieldCls} /></label>
          <label><span className={labelCls}>Type</span>
            <select name="type" className={fieldCls}>{["asset", "liability", "equity", "income", "expense"].map((t) => <option key={t}>{t}</option>)}</select>
          </label>
          <label className="flex items-center gap-2 pt-6 text-sm font-semibold"><input type="checkbox" name="is_cash" className="size-4 accent-forest-700" /> Cash / bank account</label>
          <div><SubmitButton>Add account</SubmitButton></div>
        </form>
      </Card>
    </div>
  );
}
