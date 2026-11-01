import { Plus } from "lucide-react";
import { requireErp } from "@/lib/erp/auth";
import { Badge, ButtonLink, DataTable, FilterBar, PageHeader, dateLabel, fieldCls, labelCls, money, monthStart, today } from "@/components/erp/ui";

export const metadata = { title: "Payments" };

type Row = { id: number; voucher_no: string; date: string; party_type: string; party_id: number; direction: string; amount: number; less: number; mode: string | null; ref_invoice: string | null; remark: string | null };

export default async function PaymentList({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; type?: string }> }) {
  const sp = await searchParams;
  const from = sp.from || monthStart();
  const to = sp.to || today();
  const { supabase } = await requireErp();
  let q = supabase.from("erp_payments").select("*").gte("date", from).lte("date", to).order("id", { ascending: false });
  if (sp.type) q = q.eq("party_type", sp.type);
  const { data } = await q;
  const rows = (data ?? []) as Row[];
  const ids = (t: string, kind: "retailer" | "staff" | "supplier") => [...new Set(rows.filter((r) => (kind === "staff" ? ["sr", "dsr", "staff"].includes(r.party_type) : r.party_type === t)).map((r) => r.party_id))];
  const [ret, stf, sup] = await Promise.all([
    supabase.from("erp_retailers").select("id, code, name").in("id", ids("retailer", "retailer").concat(-1)),
    supabase.from("erp_staff").select("id, name").in("id", ids("", "staff").concat(-1)),
    supabase.from("erp_suppliers").select("id, name").in("id", ids("supplier", "supplier").concat(-1)),
  ]);
  const name = (r: Row) =>
    r.party_type === "retailer"
      ? (ret.data ?? []).find((x) => x.id === r.party_id)?.name
      : r.party_type === "supplier"
        ? (sup.data ?? []).find((x) => x.id === r.party_id)?.name
        : (stf.data ?? []).find((x) => x.id === r.party_id)?.name;
  const inTotal = rows.filter((r) => r.direction === "in").reduce((s, r) => s + Number(r.amount), 0);
  const outTotal = rows.filter((r) => r.direction === "out").reduce((s, r) => s + Number(r.amount), 0);
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Payments" title="Payment list">
        <ButtonLink href="/erp/payments/new"><Plus className="size-4" /> Receive / pay</ButtonLink>
      </PageHeader>
      <FilterBar>
        <label><span className={labelCls}>From</span><input type="date" name="from" defaultValue={from} className={fieldCls} /></label>
        <label><span className={labelCls}>To</span><input type="date" name="to" defaultValue={to} className={fieldCls} /></label>
        <label>
          <span className={labelCls}>Type</span>
          <select name="type" defaultValue={sp.type ?? ""} className={fieldCls}>
            <option value="">All types</option>
            {["retailer", "sr", "dsr", "supplier", "staff"].map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
          </select>
        </label>
      </FilterBar>
      <p className="mb-3 text-sm text-ink-600">Received <b className="text-forest-700">{money(inTotal)}</b> · Paid out <b className="text-red-600">{money(outTotal)}</b></p>
      <DataTable
        rows={rows}
        empty="No payments in this period."
        cols={[
          { label: "Date", get: (r) => dateLabel(r.date) },
          { label: "Voucher", get: (r) => <span className="font-bold">{r.voucher_no}</span> },
          { label: "Type", get: (r) => r.party_type.toUpperCase() },
          { label: "Party", get: (r) => name(r) ?? "—" },
          { label: "Direction", get: (r) => <Badge tone={r.direction === "in" ? "lime" : "amber"}>{r.direction === "in" ? "Received" : "Paid"}</Badge> },
          { label: "Amount", right: true, get: (r) => money(r.amount) },
          { label: "Less", right: true, get: (r) => money(r.less) },
          { label: "Mode", get: (r) => r.mode ?? "—" },
          { label: "Ref. invoice", get: (r) => r.ref_invoice ?? "—" },
        ]}
      />
    </div>
  );
}
