import { DataTable, Notice, PageHeader, fieldCls, labelCls, money, monthStart, today } from "@/components/erp/ui";
import { requireErp } from "@/lib/erp/auth";
import { loadPayrollPolicy } from "@/lib/erp/data";
import { dsrPayroll, type IncentiveTier } from "@/lib/erp/people";
import { declareSalary } from "../../people-actions";

export const metadata = { title: "DSR payroll" };

export default async function PayrollPage({ searchParams }: { searchParams: Promise<{ month?: string; mode?: string; saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const month = sp.month ? `${sp.month.slice(0, 7)}-01` : monthStart();
  const mode = sp.mode === "flat" ? "flat" : "slab";
  const end = new Date(`${month}T00:00:00Z`);
  end.setUTCMonth(end.getUTCMonth() + 1);
  end.setUTCDate(0);
  const monthEnd = end.toISOString().slice(0, 10);
  const { supabase } = await requireErp();
  const [{ data: dsrs }, { data: orders }, { data: att }, { data: decl }, policy] = await Promise.all([
    supabase.from("erp_staff").select("id, name, salary, daily_allowance, incentive_tiers").eq("kind", "dsr").eq("active", true).order("name"),
    supabase.rpc("erp_rpt_sales_orders", { p_from: month, p_to: monthEnd, p_by: "dsr" }),
    supabase.from("erp_attendance").select("staff_id, status").gte("date", month).lte("date", monthEnd).in("status", ["present", "late"]),
    supabase.from("erp_salary_declarations").select("staff_id").eq("month", month),
    loadPayrollPolicy(supabase),
  ]);
  const declared = new Set((decl ?? []).map((d) => d.staff_id));
  const rows = (dsrs ?? []).map((d) => {
    const sales = Number(((orders ?? []) as { key: string | null; total: number }[]).find((o) => o.key === String(d.id))?.total ?? 0);
    const workingDays = (att ?? []).filter((a) => a.staff_id === d.id).length;
    const tiers = ((d.incentive_tiers as IncentiveTier[] | null)?.length ? (d.incentive_tiers as IncentiveTier[]) : policy.tiers);
    const basic = Number(d.salary) || policy.basicSalary;
    const p = dsrPayroll({ sales, workingDays, dailyAllowance: Number(d.daily_allowance) || policy.dailyAllowance, basicSalary: basic, tiers, mode });
    return { ...d, sales, workingDays, basic, ...p };
  });
  const label = new Date(`${month}T00:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Staff" title={`DSR payroll · ${label}`} />
      {sp.saved && <Notice tone="ok">{sp.saved}</Notice>}
      {sp.error && <Notice tone="error">{sp.error}</Notice>}
      <form method="get" className="mb-5 flex flex-wrap items-end gap-2">
        <label><span className={labelCls}>Month</span><input type="month" name="month" defaultValue={month.slice(0, 7)} className={fieldCls} /></label>
        <label><span className={labelCls}>Incentive</span>
          <select name="mode" defaultValue={mode} className={fieldCls}><option value="slab">Slab (each rate on its band)</option><option value="flat">Flat (top rate on all sales)</option></select>
        </label>
        <button className="rounded-full border-2 border-forest-800 px-4 py-2 text-sm font-bold text-forest-800">Show</button>
      </form>
      <DataTable
        rows={rows}
        empty="No active DSRs. Add them under People → SR, DSR & staff."
        cols={[
          { label: "DSR", get: (r) => <b>{r.name}</b> },
          { label: "Monthly sales", right: true, get: (r) => money(r.sales, 0) },
          { label: "Working days", right: true, get: (r) => r.workingDays },
          { label: "Daily allowance", right: true, get: (r) => money(r.allowance, 0) },
          { label: "Basic", right: true, get: (r) => money(r.basic, 0) },
          { label: "Incentive", right: true, get: (r) => <span title={r.breakdown.map((b) => `${b.rate}% on ${money(b.base, 0)} = ${money(b.amount, 0)}`).join("\n")}>{money(r.incentive, 0)}</span> },
          { label: "Total earnings", right: true, get: (r) => money(r.totalEarnings, 0) },
          { label: "Grand total", right: true, get: (r) => <b>{money(r.grandTotal, 0)}</b> },
          {
            label: "",
            get: (r) =>
              declared.has(r.id) ? (
                <span className="text-xs font-bold text-forest-700">Declared</span>
              ) : (
                <form action={declareSalary}>
                  <input type="hidden" name="staff_id" value={r.id} />
                  <input type="hidden" name="month" value={month} />
                  <input type="hidden" name="amount" value={r.grandTotal} />
                  <input type="hidden" name="date" value={today()} />
                  <input type="hidden" name="back" value="/erp/staff/payroll" />
                  <input type="hidden" name="breakdown" value={JSON.stringify({ sales: r.sales, workingDays: r.workingDays, allowance: r.allowance, basic: r.basic, incentive: r.incentive, mode })} />
                  <button className="rounded-lg bg-forest-900 px-2.5 py-1 text-xs font-bold text-white">Declare</button>
                </form>
              ),
          },
        ]}
      />
      <p className="mt-3 text-xs text-ink-400">
        Working days = days marked Present or Late in Attendance. Policy: basic {money(policy.basicSalary, 0)}, {money(policy.dailyAllowance, 0)}/day, incentive {policy.tiers.map((t) => `${t.rate}% from ${money(t.min, 0)}${t.max ? ` to ${money(t.max, 0)}` : " up"}`).join(", ")} (edit under DSR payroll policy). Hover an incentive for its breakdown.
      </p>
    </div>
  );
}
