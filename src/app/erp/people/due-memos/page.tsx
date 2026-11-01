import Link from "next/link";
import { DataTable, FilterBar, PageHeader, dateLabel, fieldCls, labelCls, money } from "@/components/erp/ui";
import { requireErp } from "@/lib/erp/auth";
import { selectAll } from "@/lib/erp/data";

export const metadata = { title: "Due memos" };

type D = { id: number; invoice_no: string; date: string; due: number; party_type: string };
type O = { id: number; total: number; payable: number; paid: number; retailer: { code: string; name: string; mobile: string | null; route_id: number | null } | null; sr: { name: string } | null; dsr: { name: string } | null };

/** Every invoice that still has money due, net of later collections against it. */
export default async function DueMemos({ searchParams }: { searchParams: Promise<{ route?: string; q?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireErp();
  const [open, { data: routes }] = await Promise.all([
    selectAll<D>((a, b) => supabase.from("erp_open_invoices").select("id, invoice_no, date, due, party_type").order("date").order("id").range(a, b)),
    supabase.from("erp_routes").select("id, name").order("name"),
  ]);
  const ids = open.map((d) => d.id);
  const details = new Map<number, O>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await supabase
      .from("erp_sales_orders")
      .select("id, total, payable, paid, retailer:erp_retailers(code, name, mobile, route_id), sr:erp_staff!erp_sales_orders_sr_id_fkey(name), dsr:erp_staff!erp_sales_orders_dsr_id_fkey(name)")
      .in("id", ids.slice(i, i + 200));
    for (const o of (data ?? []) as unknown as O[]) details.set(o.id, o);
  }
  const q = (sp.q ?? "").trim().toLowerCase();
  const rows = open
    .map((d) => ({ ...d, o: details.get(d.id) }))
    .filter((r) => !sp.route || String(r.o?.retailer?.route_id ?? "") === sp.route)
    .filter((r) => !q || `${r.o?.retailer?.code} ${r.o?.retailer?.name} ${r.invoice_no}`.toLowerCase().includes(q));
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="People" title="Due memos" />
      <FilterBar>
        <label><span className={labelCls}>Route</span><select name="route" defaultValue={sp.route ?? ""} className={fieldCls}><option value="">All</option>{(routes ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
        <label><span className={labelCls}>Retailer or invoice</span><input name="q" defaultValue={sp.q} className={fieldCls} /></label>
      </FilterBar>
      <DataTable
        rows={rows}
        empty="No invoices with money due."
        cols={[
          { label: "Memo / invoice", get: (r) => <Link href={`/erp/sales/${r.id}`} className="font-bold text-forest-800 hover:underline">{r.invoice_no}</Link> },
          { label: "Date", get: (r) => dateLabel(r.date) },
          { label: "Retailer", get: (r) => (r.o?.retailer ? `${r.o.retailer.code} - ${r.o.retailer.name}` : "—") },
          { label: "Mobile", get: (r) => r.o?.retailer?.mobile ?? "—" },
          { label: "SR / DSR", get: (r) => r.o?.sr?.name ?? r.o?.dsr?.name ?? "—" },
          { label: "Total", right: true, get: (r) => money(r.o?.payable) },
          { label: "Paid", right: true, get: (r) => money(Number(r.o?.payable ?? 0) - Number(r.due)) },
          { label: "Due", right: true, get: (r) => <b className="text-red-600">{money(r.due)}</b> },
          { label: "", get: (r) => <Link href={`/erp/payments/new?type=${r.party_type}`} className="text-xs font-bold text-forest-700 hover:underline print:hidden">Collect</Link> },
        ]}
        foot={["Total", "", "", "", "", money(rows.reduce((s, r) => s + Number(r.o?.payable ?? 0), 0)), money(rows.reduce((s, r) => s + Number(r.o?.payable ?? 0) - Number(r.due), 0)), money(rows.reduce((s, r) => s + Number(r.due), 0)), ""]}
      />
    </div>
  );
}
