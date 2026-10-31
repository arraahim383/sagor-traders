import { SubmitButton } from "@/components/admin/ui";
import { Card, DataTable, Notice, PageHeader, dateLabel, fieldCls, labelCls, today } from "@/components/erp/ui";
import { requireStaff } from "@/lib/admin/auth";
import { saveLeave } from "../../people-actions";

export const metadata = { title: "Leave" };

export default async function LeavePage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireStaff();
  const [{ data: staff }, { data: leaves }] = await Promise.all([
    supabase.from("erp_staff").select("id, name").eq("active", true).order("name"),
    supabase.from("erp_leaves").select("id, from_date, to_date, reason, staff:erp_staff(name)").order("from_date", { ascending: false }).limit(200),
  ]);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="Staff" title="Leave" />
      {sp.saved && <Notice tone="ok">{sp.saved}</Notice>}
      {sp.error && <Notice tone="error">{sp.error}</Notice>}
      <Card className="mb-6">
        <form action={saveLeave} className="grid gap-4 sm:grid-cols-2">
          <label><span className={labelCls}>Person</span><select name="staff_id" required className={fieldCls}><option value="">—</option>{(staff ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label><span className={labelCls}>Reason</span><input name="reason" className={fieldCls} /></label>
          <label><span className={labelCls}>From</span><input type="date" name="from_date" defaultValue={today()} required className={fieldCls} /></label>
          <label><span className={labelCls}>To</span><input type="date" name="to_date" defaultValue={today()} required className={fieldCls} /></label>
          <div><SubmitButton>Record leave</SubmitButton></div>
        </form>
      </Card>
      <DataTable
        rows={(leaves ?? []) as unknown as { id: number; from_date: string; to_date: string; reason: string | null; staff: { name: string } }[]}
        empty="No leave recorded."
        cols={[
          { label: "Person", get: (l) => l.staff.name },
          { label: "From", get: (l) => dateLabel(l.from_date) },
          { label: "To", get: (l) => dateLabel(l.to_date) },
          { label: "Days", right: true, get: (l) => Math.round((Date.parse(l.to_date) - Date.parse(l.from_date)) / 86400000) + 1 },
          { label: "Reason", get: (l) => l.reason ?? "—" },
        ]}
      />
    </div>
  );
}
