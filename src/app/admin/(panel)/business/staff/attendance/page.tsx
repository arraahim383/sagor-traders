import { SubmitButton } from "@/components/admin/ui";
import { Notice, PageHeader, fieldCls, labelCls, today } from "@/components/erp/ui";
import { requireStaff } from "@/lib/admin/auth";
import { saveAttendance } from "../../people-actions";

export const metadata = { title: "Attendance" };

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ date?: string; saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const date = sp.date || today();
  const { supabase } = await requireStaff();
  const [{ data: staff }, { data: marks }] = await Promise.all([
    supabase.from("erp_staff").select("id, kind, name").eq("active", true).order("name"),
    supabase.from("erp_attendance").select("staff_id, status, time_in, time_out").eq("date", date),
  ]);
  const mark = new Map((marks ?? []).map((m) => [m.staff_id, m]));
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="Staff" title="Attendance" />
      {sp.saved && <Notice tone="ok">{sp.saved}</Notice>}
      {sp.error && <Notice tone="error">{sp.error}</Notice>}
      <form method="get" className="mb-5 flex items-end gap-2">
        <label><span className={labelCls}>Date</span><input type="date" name="date" defaultValue={date} className={fieldCls} /></label>
        <button className="rounded-full border-2 border-forest-800 px-4 py-2 text-sm font-bold text-forest-800">Load</button>
      </form>
      <form action={saveAttendance} className="space-y-4">
        <input type="hidden" name="date" value={date} />
        <div className="overflow-x-auto rounded-2xl bg-white shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-mint-50 text-left text-[11px] font-bold uppercase tracking-wider text-ink-600">
              <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">In</th><th className="px-4 py-3">Out</th></tr>
            </thead>
            <tbody className="divide-y divide-ink-900/5">
              {(staff ?? []).map((s) => {
                const m = mark.get(s.id);
                return (
                  <tr key={s.id}>
                    <td className="px-4 py-2 font-semibold">{s.name}</td>
                    <td className="px-4 py-2 uppercase text-ink-600">{s.kind}</td>
                    <td className="px-4 py-2">
                      <select name={`status_${s.id}`} defaultValue={m?.status ?? ""} className={fieldCls}>
                        <option value="">—</option>
                        {["present", "absent", "late", "leave"].map((x) => <option key={x} value={x}>{x[0].toUpperCase() + x.slice(1)}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2"><input type="time" name={`in_${s.id}`} defaultValue={m?.time_in?.slice(0, 5) ?? ""} className={fieldCls} /></td>
                    <td className="px-4 py-2"><input type="time" name={`out_${s.id}`} defaultValue={m?.time_out?.slice(0, 5) ?? ""} className={fieldCls} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <SubmitButton>Save attendance</SubmitButton>
      </form>
    </div>
  );
}
