import { Card, PageHeader, fieldCls, labelCls } from "@/components/erp/ui";
import { requireErp } from "@/lib/erp/auth";

export const metadata = { title: "Send email" };

/** Compose here, then hand it to the device's mail app (no mail server is needed). */
export default async function SendEmail({ searchParams }: { searchParams: Promise<{ to?: string; subject?: string; body?: string }> }) {
  const sp = await searchParams;
  await requireErp();
  const to = (sp.to ?? "").split(/[\s,;]+/).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  const href = to.length ? `mailto:${to.join(",")}?${new URLSearchParams({ subject: sp.subject ?? "", body: sp.body ?? "" }).toString().replace(/\+/g, "%20")}` : null;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="SMS & Email" title="Send email" />
      <Card>
        <form method="get" className="space-y-4">
          <label className="block"><span className={labelCls}>To (one or more emails)</span><input name="to" defaultValue={sp.to} required className={fieldCls} /></label>
          <label className="block"><span className={labelCls}>Subject</span><input name="subject" defaultValue={sp.subject} className={fieldCls} /></label>
          <label className="block"><span className={labelCls}>Message</span><textarea name="body" rows={8} defaultValue={sp.body} className={fieldCls} /></label>
          <button className="btn-forest rounded-full px-5 py-2.5 text-sm font-bold">Prepare email</button>
        </form>
        {href && (
          <a href={href} className="mt-5 inline-flex rounded-full border-2 border-forest-800 px-5 py-2.5 text-sm font-bold text-forest-800 hover:bg-mint-50">
            Open in mail app ({to.length} recipient{to.length > 1 ? "s" : ""})
          </a>
        )}
        <p className="mt-3 text-xs text-ink-400">The email opens in your phone or computer&apos;s mail app, ready to send from your own address.</p>
      </Card>
    </div>
  );
}
