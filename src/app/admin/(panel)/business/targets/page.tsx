import { SubmitButton } from "@/components/admin/ui";
import { Card, DataTable, Notice, PageHeader, cellCls, fieldCls, labelCls, money, monthStart, today } from "@/components/erp/ui";
import { requireStaff } from "@/lib/admin/auth";
import { daysLeftInMonth, targetProgress } from "@/lib/erp/people";
import { saveTargets } from "../people-actions";

export const metadata = { title: "SR targets" };

export default async function TargetsPage({ searchParams }: { searchParams: Promise<{ month?: string; saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const month = sp.month ? `${sp.month.slice(0, 7)}-01` : monthStart();
  const prev = new Date(`${month}T00:00:00Z`);
  prev.setUTCMonth(prev.getUTCMonth() - 1);
  const prevMonth = prev.toISOString().slice(0, 10);
  const end = new Date(`${month}T00:00:00Z`);
  end.setUTCMonth(end.getUTCMonth() + 1);
  end.setUTCDate(0);
  const monthEnd = end.toISOString().slice(0, 10);
  const { supabase } = await requireStaff();
  const [{ data: srs }, { data: targets }, { data: prevT }, { data: drafts }, { data: done }] = await Promise.all([
    supabase.from("erp_staff").select("id, name").eq("kind", "sr").eq("active", true).order("name"),
    supabase.from("erp_sr_targets").select("sr_id, target, remark").eq("month", month),
    supabase.from("erp_sr_targets").select("sr_id, target").eq("month", prevMonth),
    supabase.from("erp_sales_orders").select("sr_id, total").eq("status", "draft").gte("date", month).lte("date", monthEnd).not("sr_id", "is", null),
    supabase.rpc("erp_rpt_sales_orders", { p_from: month, p_to: monthEnd, p_by: "sr" }),
  ]);
  const t = new Map((targets ?? []).map((x) => [x.sr_id, x]));
  const pt = new Map((prevT ?? []).map((x) => [x.sr_id, Number(x.target)]));
  const fin = new Map(((done ?? []) as { key: string | null; total: number; orders: number }[]).filter((r) => r.key).map((r) => [Number(r.key), r]));
  const pendingOf = (srId: number) => (drafts ?? []).filter((o) => o.sr_id === srId).reduce((s, o) => s + Number(o.total), 0);
  const isCurrent = month === monthStart();
  const daysLeft = isCurrent ? daysLeftInMonth(new Date(`${today()}T00:00:00`)) : 0;
  const rows = (srs ?? []).map((s) => {
    const target = Number(t.get(s.id)?.target ?? 0);
    const achieved = Number(fin.get(s.id)?.total ?? 0);
    return { ...s, target, achieved, pending: pendingOf(s.id), invoices: Number(fin.get(s.id)?.orders ?? 0), ...targetProgress(target, achieved, daysLeft) };
  });
  const label = new Date(`${month}T00:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="People" title={`SR targets · ${label}`} />
      {sp.saved && <Notice tone="ok">{sp.saved}</Notice>}
      {sp.error && <Notice tone="error">{sp.error}</Notice>}
      <form method="get" className="mb-5 flex items-end gap-2">
        <label><span className={labelCls}>Month</span><input type="month" name="month" defaultValue={month.slice(0, 7)} className={fieldCls} /></label>
        <button className="rounded-full border-2 border-forest-800 px-4 py-2 text-sm font-bold text-forest-800">Show</button>
      </form>
      <Card title="Set targets" className="mb-6">
        <form action={saveTargets} className="space-y-3">
          <input type="hidden" name="month" value={month} />
          {(srs ?? []).map((s) => (
            <div key={s.id} className="grid items-center gap-2 sm:grid-cols-[1fr_140px_1fr]">
              <span className="font-semibold">{s.name} <span className="text-xs text-ink-400">last month {money(pt.get(s.id) ?? 0, 0)}</span></span>
              <input type="number" name={`target_${s.id}`} min={0} step="any" defaultValue={t.get(s.id)?.target ?? pt.get(s.id) ?? ""} className={`${cellCls} w-full text-right`} />
              <input name={`remark_${s.id}`} placeholder="Remark" defaultValue={t.get(s.id)?.remark ?? ""} className={fieldCls} />
            </div>
          ))}
          <p className="text-xs text-ink-400">Empty boxes are pre-filled with last month&apos;s target, like Rushda&apos;s &ldquo;copy previous&rdquo;.</p>
          <SubmitButton>Save targets</SubmitButton>
        </form>
      </Card>
      <DataTable
        rows={rows}
        cols={[
          { label: "SR", get: (r) => <b>{r.name}</b> },
          { label: "Target", right: true, get: (r) => money(r.target, 0) },
          { label: "Achieved", right: true, get: (r) => money(r.achieved, 0) },
          { label: "Achievement", right: true, get: (r) => (r.percent == null ? "—" : `${r.percent}%`) },
          { label: "Remaining", right: true, get: (r) => money(r.remaining, 0) },
          { label: "Pending (drafts)", right: true, get: (r) => money(r.pending, 0) },
          { label: "Need / day", right: true, get: (r) => (r.needPerDay == null ? "—" : money(r.needPerDay, 0)) },
          { label: "Invoices", right: true, get: (r) => r.invoices },
        ]}
      />
      <p className="mt-3 text-xs text-ink-400">Achieved = finalized sales of the SR this month. Pending = drafts not finalized yet. Need / day = remaining ÷ calendar days left including today.</p>
    </div>
  );
}
