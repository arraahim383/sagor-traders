import { requireStaff } from "@/lib/admin/auth";
import { selectAll } from "@/lib/erp/data";
import { FilterBar, PageHeader, dateLabel, fieldCls, labelCls, money, monthStart, today } from "@/components/erp/ui";

export const metadata = { title: "Journal book" };

type J = { id: number; date: string; voucher_no: string; narration: string | null; source: string; lines: { debit: number; credit: number; account: { code: string; name: string } }[] };

export default async function JournalBook({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  const from = sp.from || monthStart();
  const to = sp.to || today();
  const { supabase } = await requireStaff();
  const rows = await selectAll<J>((a, b) =>
    supabase.from("erp_journals").select("id, date, voucher_no, narration, source, lines:erp_journal_lines(debit, credit, account:erp_accounts(code, name))").gte("date", from).lte("date", to).order("date").order("id").range(a, b) as never,
  );
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="Accounts" title="Journal book" />
      <FilterBar>
        <label><span className={labelCls}>From</span><input type="date" name="from" defaultValue={from} className={fieldCls} /></label>
        <label><span className={labelCls}>To</span><input type="date" name="to" defaultValue={to} className={fieldCls} /></label>
      </FilterBar>
      {rows.length === 0 && <p className="rounded-2xl bg-white p-10 text-center text-ink-600 shadow-card">No entries in this period.</p>}
      <div className="space-y-4">
        {rows.map((j) => (
          <section key={j.id} className="rounded-2xl bg-white p-4 shadow-card">
            <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm">
              <span className="font-bold text-forest-800">{j.voucher_no}</span>
              <span className="text-ink-600">{dateLabel(j.date)} · {j.narration}</span>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-ink-900/5">
                {j.lines.map((l, i) => (
                  <tr key={i}>
                    <td className={`py-1.5 ${Number(l.credit) ? "pl-6" : ""}`}><span className="text-ink-400">{l.account.code}</span> {l.account.name}</td>
                    <td className="w-32 py-1.5 text-right tabular-nums">{Number(l.debit) ? money(l.debit) : ""}</td>
                    <td className="w-32 py-1.5 text-right tabular-nums">{Number(l.credit) ? money(l.credit) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </div>
  );
}
