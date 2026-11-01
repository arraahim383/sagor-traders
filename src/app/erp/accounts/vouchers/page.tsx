import { DataTable, FilterBar, PageHeader, dateLabel, fieldCls, labelCls, money, monthStart, today } from "@/components/erp/ui";
import { requireErp } from "@/lib/erp/auth";
import { selectAll } from "@/lib/erp/data";

export const metadata = { title: "Voucher list" };

type V = { id: number; voucher_no: string; date: string; narration: string | null; created_by: string | null; lines: { debit: number; account: { code: string; name: string } }[] };

/** Journal vouchers entered by hand (Accounts → Journal voucher). */
export default async function VoucherList({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  const from = sp.from || monthStart();
  const to = sp.to || today();
  const { supabase } = await requireErp();
  const rows = await selectAll<V>((a, b) =>
    supabase
      .from("erp_journals")
      .select("id, voucher_no, date, narration, created_by, lines:erp_journal_lines(debit, account:erp_accounts(code, name))")
      .eq("source", "erp_journals_manual")
      .gte("date", from)
      .lte("date", to)
      .order("date")
      .order("id")
      .range(a, b) as never,
  );
  const amount = (v: V) => v.lines.reduce((s, l) => s + Number(l.debit), 0);
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="Accounts" title="Voucher list" />
      <FilterBar>
        <label><span className={labelCls}>From</span><input type="date" name="from" defaultValue={from} className={fieldCls} /></label>
        <label><span className={labelCls}>To</span><input type="date" name="to" defaultValue={to} className={fieldCls} /></label>
      </FilterBar>
      <DataTable
        rows={rows}
        empty="No journal vouchers in this period."
        cols={[
          { label: "Voucher", get: (v) => <b>{v.voucher_no}</b> },
          { label: "Date", get: (v) => dateLabel(v.date) },
          { label: "Narration", get: (v) => v.narration ?? "—" },
          { label: "Debited", get: (v) => v.lines.filter((l) => Number(l.debit) > 0).map((l) => l.account.name).join(", ") },
          { label: "Amount", right: true, get: (v) => money(amount(v)) },
          { label: "Created by", get: (v) => v.created_by || "—" },
        ]}
        foot={["Total", "", "", "", money(rows.reduce((s, v) => s + amount(v), 0)), ""]}
      />
    </div>
  );
}
