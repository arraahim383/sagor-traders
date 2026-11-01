import { SubmitButton } from "@/components/admin/ui";
import { Card, FilterBar, Notice, PageHeader, fieldCls, labelCls, money } from "@/components/erp/ui";
import { requireErp } from "@/lib/erp/auth";
import { partyBalances, selectAll } from "@/lib/erp/data";
import { normalizeBdMobile } from "@/lib/erp/sms-utils";
import { sendDue } from "../actions";

export const metadata = { title: "Due SMS" };

type P = { id: number; name: string; mobile: string | null; due: number };

const DEFAULT_TEXT = "Dear {name}, your due with {company} is Tk {due}. Please pay at your earliest. Thank you.";

export default async function DueSms({ searchParams }: { searchParams: Promise<{ group?: string; saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const group = ["retailer", "supplier", "dsr", "sr"].includes(sp.group ?? "") ? sp.group! : "retailer";
  const { supabase } = await requireErp();
  const [bal, { data: company }] = await Promise.all([partyBalances(supabase, group), supabase.from("erp_settings").select("value").eq("key", "company").maybeSingle()]);
  let people: { id: number; name: string; mobile: string | null }[] = [];
  if (group === "retailer") {
    people = (await selectAll<{ id: number; code: string; name: string; mobile: string | null }>((a, b) => supabase.from("erp_retailers").select("id, code, name, mobile").order("id").range(a, b))).map((r) => ({ id: r.id, name: r.name, mobile: r.mobile }));
  } else if (group === "supplier") {
    people = (await supabase.from("erp_suppliers").select("id, name, mobile")).data ?? [];
  } else {
    people = (await supabase.from("erp_staff").select("id, name, mobile").eq("kind", group)).data ?? [];
  }
  // Suppliers: we owe them (credit balance), so "due" there is what we owe; for everyone else it's what they owe us.
  const sign = group === "supplier" ? -1 : 1;
  const rows: P[] = people.map((p) => ({ ...p, due: sign * (bal.get(p.id) ?? 0) })).filter((p) => p.due > 0.5).sort((a, b) => b.due - a.due);
  const companyName = ((company?.value ?? {}) as { name?: string }).name ?? "M/S Sagor Traders";

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="SMS & Email" title="Due SMS" />
      {sp.saved && <Notice tone="ok">{sp.saved}</Notice>}
      {sp.error && <Notice tone="error">{sp.error}</Notice>}
      <FilterBar>
        <label><span className={labelCls}>Group</span>
          <select name="group" defaultValue={group} className={fieldCls}><option value="retailer">Retailers</option><option value="sr">SRs</option><option value="dsr">DSRs</option><option value="supplier">Suppliers</option></select>
        </label>
      </FilterBar>
      <form action={sendDue} className="space-y-4">
        <input type="hidden" name="group" value={group} />
        <input type="hidden" name="company" value={companyName} />
        <Card>
          <label className="block"><span className={labelCls}>Message ({"{name}"}, {"{due}"} and {"{company}"} are filled in per person)</span><textarea name="template" rows={3} defaultValue={DEFAULT_TEXT} className={fieldCls} /></label>
        </Card>
        <div className="overflow-x-auto rounded-2xl bg-white shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-mint-50 text-left text-[11px] font-bold uppercase tracking-wider text-ink-600">
              <tr><th className="px-4 py-3">Send</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Mobile</th><th className="px-4 py-3 text-right">Due</th></tr>
            </thead>
            <tbody className="divide-y divide-ink-900/5">
              {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-ink-600">Nobody in this group has a due balance.</td></tr>}
              {rows.map((r) => {
                const ok = r.mobile ? normalizeBdMobile(r.mobile) : null;
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-2">{ok ? <input type="checkbox" name={`pick:${ok}:${r.due.toFixed(2)}:${r.name}`} defaultChecked className="size-4 accent-forest-700" aria-label={`Send to ${r.name}`} /> : <span className="text-xs text-ink-400">no mobile</span>}</td>
                    <td className="px-4 py-2 font-semibold">{r.name}</td>
                    <td className="px-4 py-2">{r.mobile ?? "—"}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{money(r.due)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length > 0 && <SubmitButton>Send reminders</SubmitButton>}
      </form>
    </div>
  );
}
