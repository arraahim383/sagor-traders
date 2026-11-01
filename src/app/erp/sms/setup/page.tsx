import { SubmitButton } from "@/components/admin/ui";
import { Card, Notice, PageHeader, fieldCls, labelCls } from "@/components/erp/ui";
import { requireErpAdmin } from "@/lib/erp/auth";
import { saveSmsSetup } from "../actions";

export const metadata = { title: "SMS API setup" };

export default async function SmsSetup({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireErpAdmin();
  const { data } = await supabase.from("erp_settings").select("value").eq("key", "sms").maybeSingle();
  const v = (data?.value ?? {}) as Record<string, string>;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="SMS & Email" title="SMS API setup" />
      {sp.saved && <Notice tone="ok">{sp.saved}</Notice>}
      {sp.error && <Notice tone="error">{sp.error}</Notice>}
      <Card>
        <form action={saveSmsSetup} className="grid gap-4 sm:grid-cols-2">
          <label><span className={labelCls}>Username</span><input name="username" defaultValue={v.username} autoComplete="off" className={fieldCls} /></label>
          <label><span className={labelCls}>Password</span><input type="password" name="password" autoComplete="new-password" placeholder={v.password ? "Saved — leave empty to keep" : ""} className={fieldCls} /></label>
          <label><span className={labelCls}>CLI / sender name</span><input name="cli" defaultValue={v.cli} className={fieldCls} /></label>
          <label><span className={labelCls}>Bill MSISDN</span><input name="billMsisdn" defaultValue={v.billMsisdn} className={fieldCls} /></label>
          <label className="sm:col-span-2"><span className={labelCls}>Send URL</span><input name="sendUrl" defaultValue={v.sendUrl} placeholder="https://…?user={user}&pass={pass}&sender={cli}&to={to}&msg={msg}" className={fieldCls} /></label>
          <label className="sm:col-span-2"><span className={labelCls}>Balance / management URL (optional)</span><input name="balanceUrl" defaultValue={v.balanceUrl} placeholder="https://…?user={user}&pass={pass}" className={fieldCls} /></label>
          <div className="sm:col-span-2"><SubmitButton>Save</SubmitButton></div>
        </form>
        <div className="mt-4 space-y-1 text-xs text-ink-400">
          <p>Copy the send address from your Banglalink corporate SMS account, and put these markers where each value goes: <code>{"{user}"}</code> <code>{"{pass}"}</code> <code>{"{cli}"}</code> <code>{"{to}"}</code> <code>{"{msg}"}</code> <code>{"{bill}"}</code>. They&apos;re filled in and encoded for every message.</p>
          <p>Numbers are sent as 8801XXXXXXXXX. Only administrators can see or change this page.</p>
        </div>
      </Card>
    </div>
  );
}
