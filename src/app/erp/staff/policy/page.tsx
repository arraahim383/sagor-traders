import { SubmitButton } from "@/components/admin/ui";
import { Card, Notice, PageHeader, cellCls, fieldCls, labelCls } from "@/components/erp/ui";
import { requireErp } from "@/lib/erp/auth";
import { loadPayrollPolicy } from "@/lib/erp/data";
import { savePayrollPolicy } from "../../people-actions";

export const metadata = { title: "DSR payroll policy" };

export default async function PolicyPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireErp();
  const policy = await loadPayrollPolicy(supabase);
  const rows = Array.from({ length: 6 }, (_, i) => policy.tiers[i] ?? null);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Staff" title="DSR payroll policy" />
      {sp.saved && <Notice tone="ok">{sp.saved}</Notice>}
      {sp.error && <Notice tone="error">{sp.error}</Notice>}
      <Card>
        <form action={savePayrollPolicy} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className={labelCls}>Basic salary (৳ / month)</span><input type="number" name="basicSalary" step="any" min={0} defaultValue={policy.basicSalary} className={fieldCls} /></label>
            <label><span className={labelCls}>Daily allowance (৳ / working day)</span><input type="number" name="dailyAllowance" step="any" min={0} defaultValue={policy.dailyAllowance} className={fieldCls} /></label>
          </div>
          <div>
            <p className={labelCls}>Incentive tiers on monthly sales</p>
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] font-bold uppercase tracking-wider text-ink-600"><tr><th className="py-2">From (৳)</th><th className="py-2">To (৳, blank = no limit)</th><th className="py-2">Rate %</th></tr></thead>
              <tbody>
                {rows.map((t, i) => (
                  <tr key={i}>
                    <td className="py-1 pr-2"><input type="number" name={`min_${i}`} step="any" min={0} defaultValue={t?.min ?? ""} className={`${cellCls} w-full text-right`} /></td>
                    <td className="py-1 pr-2"><input type="number" name={`max_${i}`} step="any" min={0} defaultValue={t?.max ?? ""} className={`${cellCls} w-full text-right`} /></td>
                    <td className="py-1"><input type="number" name={`rate_${i}`} step="any" min={0} defaultValue={t?.rate ?? ""} className={`${cellCls} w-full text-right`} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-ink-400">Applies to DSRs who have no tiers of their own. A DSR&apos;s own basic salary and daily allowance (People → DSR list) take priority when set.</p>
          <SubmitButton>Save policy</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
