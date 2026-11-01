import Link from "next/link";
import { SubmitButton } from "@/components/admin/ui";
import { Card, Notice, PageHeader, fieldCls, labelCls } from "@/components/erp/ui";
import { requireErp } from "@/lib/erp/auth";
import { loadSmsConfig } from "@/lib/erp/sms";
import { sendSingle } from "./actions";

export const metadata = { title: "Send SMS" };

export default async function SendSms({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireErp();
  const cfg = await loadSmsConfig(supabase);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="SMS & Email" title="Send SMS" />
      {sp.saved && <Notice tone="ok">{sp.saved}</Notice>}
      {sp.error && <Notice tone="error">{sp.error}</Notice>}
      {!cfg && <Notice tone="error">SMS isn&apos;t set up yet. An administrator needs to enter the gateway details under <Link href="/erp/sms/setup" className="underline">SMS API setup</Link>.</Notice>}
      <Card>
        <form action={sendSingle} className="space-y-4">
          <label className="block"><span className={labelCls}>Mobile numbers (one per line, or separated by commas)</span><textarea name="numbers" rows={4} required placeholder="01712345678" className={fieldCls} /></label>
          <label className="block"><span className={labelCls}>Message</span><textarea name="message" rows={5} required className={fieldCls} /></label>
          <p className="text-xs text-ink-400">One SMS holds 160 English characters, or 70 when the message has Bangla. Longer messages are sent as several parts.</p>
          <SubmitButton>Send</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
