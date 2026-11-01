import { Badge, Card, DataTable, PageHeader } from "@/components/erp/ui";
import { requireErp } from "@/lib/erp/auth";
import { smsBalance } from "@/lib/erp/sms";

export const metadata = { title: "SMS balance & log" };

export default async function SmsLog({ searchParams }: { searchParams: Promise<{ check?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireErp();
  const [{ data }, balance] = await Promise.all([
    supabase.from("erp_sms_log").select("id, sent_at, kind, numbers, message, status, response, sent_by").order("id", { ascending: false }).limit(200),
    sp.check ? smsBalance(supabase) : Promise.resolve(undefined),
  ]);
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="SMS & Email" title="SMS balance & log" />
      <Card title="Balance" className="mb-6">
        {balance === undefined ? (
          <form method="get"><button name="check" value="1" className="btn-forest rounded-full px-5 py-2.5 text-sm font-bold">Check balance</button></form>
        ) : balance === null ? (
          <p className="text-sm text-ink-600">No balance URL is set under SMS API setup.</p>
        ) : (
          <pre className="whitespace-pre-wrap rounded-xl bg-cream-50 p-3 text-sm">{balance}</pre>
        )}
      </Card>
      <DataTable
        rows={data ?? []}
        empty="Nothing sent yet."
        cols={[
          { label: "When", get: (r) => new Date(r.sent_at).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" }) },
          { label: "Type", get: (r) => r.kind },
          { label: "To", right: true, get: (r) => `${r.numbers.length} number${r.numbers.length > 1 ? "s" : ""}` },
          { label: "Message", get: (r) => <span className="line-clamp-2 max-w-md">{r.message}</span> },
          { label: "Status", get: (r) => <span title={r.response ?? ""}><Badge tone={r.status === "sent" ? "lime" : r.status === "failed" ? "red" : "amber"}>{r.status}</Badge></span> },
          { label: "By", get: (r) => r.sent_by || "—" },
        ]}
      />
    </div>
  );
}
