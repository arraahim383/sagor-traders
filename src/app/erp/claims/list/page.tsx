import { Badge, DataTable, FilterBar, PageHeader, dateLabel, fieldCls, labelCls, money, qty } from "@/components/erp/ui";
import { requireErp } from "@/lib/erp/auth";

export const metadata = { title: "Claim send list" };

type C = { id: number; claim_no: string; date: string; claimed: number; received: number; status: string; remark: string | null; supplier: { name: string }; lines: { qty: number }[] };

/** Damage claims sent to suppliers. */
export default async function ClaimSendList({ searchParams }: { searchParams: Promise<{ supplier?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireErp();
  let q = supabase.from("erp_claims").select("id, claim_no, date, claimed, received, status, remark, supplier:erp_suppliers(name), lines:erp_claim_lines(qty)").eq("type", "Damage");
  if (sp.supplier) q = q.eq("supplier_id", sp.supplier);
  const [{ data }, { data: suppliers }] = await Promise.all([q.order("id", { ascending: false }).limit(500), supabase.from("erp_suppliers").select("id, name").order("name")]);
  const rows = (data ?? []) as unknown as C[];
  const q2 = (c: C) => c.lines.reduce((s, l) => s + Number(l.qty), 0);
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="Stock" title="Claim send list" />
      <FilterBar>
        <label><span className={labelCls}>Supplier</span><select name="supplier" defaultValue={sp.supplier ?? ""} className={fieldCls}><option value="">All</option>{(suppliers ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      </FilterBar>
      <DataTable
        rows={rows}
        empty="No damage claims sent yet."
        cols={[
          { label: "Claim", get: (c) => <b>{c.claim_no}</b> },
          { label: "Date", get: (c) => dateLabel(c.date) },
          { label: "Supplier", get: (c) => c.supplier.name },
          { label: "Qty", right: true, get: (c) => qty(q2(c)) },
          { label: "Amount", right: true, get: (c) => money(c.claimed) },
          { label: "Received", right: true, get: (c) => money(c.received) },
          { label: "Status", get: (c) => <Badge tone={c.status === "Settled" ? "lime" : "amber"}>{c.status}</Badge> },
          { label: "Remark", get: (c) => c.remark ?? "—" },
        ]}
        foot={["Total", "", "", qty(rows.reduce((s, c) => s + q2(c), 0)), money(rows.reduce((s, c) => s + Number(c.claimed), 0)), money(rows.reduce((s, c) => s + Number(c.received), 0)), "", ""]}
      />
    </div>
  );
}
