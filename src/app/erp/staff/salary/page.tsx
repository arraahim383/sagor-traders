import Link from "next/link";
import { SubmitButton } from "@/components/admin/ui";
import { ButtonLink, Card, DataTable, Notice, PageHeader, dateLabel, fieldCls, labelCls, money, monthStart, today } from "@/components/erp/ui";
import { requireErp } from "@/lib/erp/auth";
import { partyBalances } from "@/lib/erp/data";
import { declareSalary } from "../../people-actions";

export const metadata = { title: "Salary" };

export default async function SalaryPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireErp();
  const [{ data: staff }, { data: decl }, owed, { data: paid }] = await Promise.all([
    supabase.from("erp_staff").select("id, name, kind, designation, salary").eq("active", true).order("name"),
    supabase.from("erp_salary_declarations").select("id, voucher_no, month, amount, staff:erp_staff(name, designation)").order("month", { ascending: false }).limit(200),
    partyBalances(supabase, "staff"),
    supabase.from("erp_payments").select("party_id, amount").eq("party_type", "staff"),
  ]);
  const paidBy = new Map<number, number>();
  for (const p of paid ?? []) paidBy.set(p.party_id, (paidBy.get(p.party_id) ?? 0) + Number(p.amount));
  const payables = (staff ?? []).map((s) => ({ ...s, outstanding: -(owed.get(s.id) ?? 0), paid: paidBy.get(s.id) ?? 0 })).filter((s) => Math.abs(s.outstanding) > 0.005 || s.paid > 0);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="Staff" title="Salary">
        <ButtonLink href="/erp/payments/new?type=staff">Pay salary</ButtonLink>
      </PageHeader>
      {sp.saved && <Notice tone="ok">{sp.saved}</Notice>}
      {sp.error && <Notice tone="error">{sp.error}</Notice>}
      <Card title="Declare a month's salary" className="mb-6">
        <form action={declareSalary} className="grid gap-4 sm:grid-cols-4">
          <label className="sm:col-span-2"><span className={labelCls}>Person</span>
            <select name="staff_id" required className={fieldCls}><option value="">—</option>{(staff ?? []).map((s) => <option key={s.id} value={s.id}>{s.name} · {s.designation ?? s.kind} · basic {money(s.salary, 0)}</option>)}</select>
          </label>
          <label><span className={labelCls}>Month</span><input type="month" name="month" defaultValue={monthStart().slice(0, 7)} className={fieldCls} /></label>
          <label><span className={labelCls}>Amount</span><input type="number" name="amount" min="0.01" step="any" required className={fieldCls} /></label>
          <input type="hidden" name="date" value={today()} />
          <div className="sm:col-span-4"><SubmitButton>Declare salary</SubmitButton></div>
        </form>
        <p className="mt-3 text-xs text-ink-400">Declaring books the salary as owed; pay it from Payments → Staff salary. DSR salaries can be worked out on the DSR payroll page.</p>
      </Card>
      <h2 className="mb-3 text-lg font-extrabold">Salary payables</h2>
      <DataTable
        rows={payables}
        empty="No salary declared yet."
        cols={[
          { label: "Person", get: (s) => s.name },
          { label: "Paid so far", right: true, get: (s) => money(s.paid) },
          { label: "Outstanding", right: true, get: (s) => <b className={s.outstanding > 0.005 ? "text-red-600" : ""}>{money(s.outstanding)}</b> },
        ]}
      />
      <h2 className="mb-3 mt-8 text-lg font-extrabold">Salary history</h2>
      <DataTable
        rows={(decl ?? []) as unknown as { id: number; voucher_no: string; month: string; amount: number; staff: { name: string; designation: string | null } }[]}
        empty="Nothing declared yet."
        cols={[
          { label: "Voucher", get: (d) => <Link href={`/erp/staff/salary/${d.id}`} className="font-bold text-forest-800 hover:underline">{d.voucher_no}</Link> },
          { label: "Person", get: (d) => d.staff.name },
          { label: "Designation", get: (d) => d.staff.designation ?? "—" },
          { label: "Month", get: (d) => dateLabel(d.month).slice(3) },
          { label: "Amount", right: true, get: (d) => money(d.amount) },
          { label: "", get: (d) => <Link href={`/erp/staff/salary/${d.id}`} className="text-xs font-bold text-forest-700 hover:underline">Payslip</Link> },
        ]}
      />
    </div>
  );
}
