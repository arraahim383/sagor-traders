import { SubmitButton } from "@/components/admin/ui";
import { Card, Notice, PageHeader, fieldCls, labelCls } from "@/components/erp/ui";
import { requireErp } from "@/lib/erp/auth";
import { sendBulk } from "../actions";

export const metadata = { title: "Bulk SMS" };

export default async function BulkSms({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireErp();
  const { data: routes } = await supabase.from("erp_routes").select("id, name").order("name");
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="SMS & Email" title="Bulk SMS" />
      {sp.saved && <Notice tone="ok">{sp.saved}</Notice>}
      {sp.error && <Notice tone="error">{sp.error}</Notice>}
      <Card>
        <form action={sendBulk} className="space-y-4">
          <label className="block"><span className={labelCls}>Send to</span>
            <select name="group" className={fieldCls}>
              <optgroup label="Retailers">
                <option value="retailers">All active retailers</option>
                {(routes ?? []).map((r) => <option key={r.id} value={`route:${r.id}`}>Retailers on {r.name}</option>)}
              </optgroup>
              <option value="suppliers">All suppliers</option>
              <option value="srdsr">All SRs and DSRs</option>
              <option value="staff">All staff (incl. SR / DSR)</option>
            </select>
          </label>
          <label className="block"><span className={labelCls}>Message</span><textarea name="message" rows={5} required className={fieldCls} /></label>
          <p className="text-xs text-ink-400">Only people with a valid Bangladeshi mobile number on file get it; duplicates are sent once. Up to 1,000 numbers per send.</p>
          <SubmitButton>Send to group</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
