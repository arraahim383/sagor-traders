import { SubmitButton } from "@/components/admin/ui";
import { Badge, Card, DataTable, Notice, PageHeader, dateLabel, fieldCls, labelCls, money, today } from "@/components/erp/ui";
import { requireErp } from "@/lib/erp/auth";
import { loadRetailers } from "@/lib/erp/data";
import { saveReminder, toggleReminder } from "../people-actions";

export const metadata = { title: "Reminders" };

type R = { id: number; remind_on: string; title: string; amount: number | null; note: string | null; done: boolean; retailer: { code: string; name: string } | null; staff: { name: string } | null };

export default async function RemindersPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireErp();
  const [{ data }, retailers, { data: staff }] = await Promise.all([
    supabase.from("erp_reminders").select("id, remind_on, title, amount, note, done, retailer:erp_retailers(code, name), staff:erp_staff(name)").order("done").order("remind_on").limit(500),
    loadRetailers(supabase),
    supabase.from("erp_staff").select("id, name").eq("active", true).order("name"),
  ]);
  const rows = (data ?? []) as unknown as R[];
  const t = today();
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="Sales" title="Due collection reminders" />
      {sp.saved && <Notice tone="ok">{sp.saved}</Notice>}
      {sp.error && <Notice tone="error">{sp.error}</Notice>}
      <Card className="mb-6">
        <form action={saveReminder} className="grid gap-4 sm:grid-cols-3">
          <label className="sm:col-span-2"><span className={labelCls}>Title</span><input name="title" required defaultValue="Due collection" className={fieldCls} /></label>
          <label><span className={labelCls}>Remind on</span><input type="date" name="remind_on" defaultValue={t} required className={fieldCls} /></label>
          <label><span className={labelCls}>Retailer</span><select name="retailer_id" className={fieldCls}><option value="">—</option>{retailers.map((r) => <option key={r.id} value={r.id}>{r.code} - {r.name}</option>)}</select></label>
          <label><span className={labelCls}>SR / DSR</span><select name="staff_id" className={fieldCls}><option value="">—</option>{(staff ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label><span className={labelCls}>Amount</span><input type="number" name="amount" step="any" className={fieldCls} /></label>
          <label className="sm:col-span-2"><span className={labelCls}>Note</span><input name="note" className={fieldCls} /></label>
          <div className="flex items-end"><SubmitButton>Add reminder</SubmitButton></div>
        </form>
      </Card>
      <DataTable
        rows={rows}
        empty="No reminders."
        cols={[
          { label: "Date", get: (r) => <span className={!r.done && r.remind_on <= t ? "font-bold text-red-600" : ""}>{dateLabel(r.remind_on)}</span> },
          { label: "Title", get: (r) => r.title },
          { label: "Retailer", get: (r) => (r.retailer ? `${r.retailer.code} - ${r.retailer.name}` : "—") },
          { label: "SR / DSR", get: (r) => r.staff?.name ?? "—" },
          { label: "Amount", right: true, get: (r) => (r.amount ? money(r.amount) : "—") },
          { label: "Status", get: (r) => <Badge tone={r.done ? "lime" : r.remind_on <= t ? "red" : "amber"}>{r.done ? "Done" : r.remind_on <= t ? "Due" : "Upcoming"}</Badge> },
          {
            label: "",
            get: (r) => (
              <form action={toggleReminder.bind(null, r.id, !r.done)}>
                <button className="rounded-lg px-2.5 py-1 text-xs font-bold text-forest-700 hover:bg-mint-50">{r.done ? "Reopen" : "Mark done"}</button>
              </form>
            ),
          },
        ]}
      />
    </div>
  );
}
