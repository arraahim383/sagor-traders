import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge, DataTable, FilterBar, PageHeader, Pager, dateLabel, fieldCls, labelCls, money } from "@/components/erp/ui";
import { requireErp } from "@/lib/erp/auth";

export const metadata = { title: "Sales" };

type Row = {
  id: number; invoice_no: string; date: string; type: string; status: string; total: number; payable: number; paid: number;
  sr: { name: string } | null; dsr: { name: string } | null; retailer: { code: string; name: string } | null;
};
type SP = { status?: string; from?: string; to?: string; sr?: string; route?: string; q?: string; p?: string };

const TYPE: Record<string, string> = { dsr: "DSR Sales", direct: "Direct", return: "Return" };
const PAGE = 50;

export default async function SalesListPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.p) || 1);
  const { supabase } = await requireErp();
  const [{ data: srs }, { data: routes }] = await Promise.all([
    supabase.from("erp_staff").select("id, name").eq("kind", "sr").order("name"),
    supabase.from("erp_routes").select("id, name").order("name"),
  ]);

  let retailerIds: number[] | null = null;
  if (sp.route || sp.q) {
    let rq = supabase.from("erp_retailers").select("id");
    if (sp.route) rq = rq.eq("route_id", sp.route);
    const q = (sp.q ?? "").replace(/[,()%*\\]/g, " ").trim();
    if (q) rq = rq.or(`code.ilike.%${q}%,name.ilike.%${q}%`);
    retailerIds = ((await rq.limit(1000)).data ?? []).map((r) => r.id);
  }
  let query = supabase
    .from("erp_sales_orders")
    .select("id, invoice_no, date, type, status, total, payable, paid, sr:erp_staff!erp_sales_orders_sr_id_fkey(name), dsr:erp_staff!erp_sales_orders_dsr_id_fkey(name), retailer:erp_retailers(code, name)", { count: "exact" });
  if (sp.status === "draft" || sp.status === "finalized") query = query.eq("status", sp.status);
  if (sp.from) query = query.gte("date", sp.from);
  if (sp.to) query = query.lte("date", sp.to);
  if (sp.sr) query = query.eq("sr_id", sp.sr);
  if (retailerIds) query = query.in("retailer_id", retailerIds.length ? retailerIds : [-1]);
  const { data, count } = await query.order("id", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  const rows = (data ?? []) as unknown as Row[];
  const qs = (p: number) => `?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([k, v]) => v && k !== "p")), p: String(p) })}`;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Sales & Order" title={sp.status === "draft" ? "Draft invoices" : "Sales list"}>
        <Link href="/erp/sales/new" className="btn-forest inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold"><Plus className="size-4" /> New sales order</Link>
      </PageHeader>
      <FilterBar>
        <label><span className={labelCls}>Status</span>
          <select name="status" defaultValue={sp.status ?? ""} className={fieldCls}><option value="">All</option><option value="draft">Draft</option><option value="finalized">Finalized</option></select>
        </label>
        <label><span className={labelCls}>From</span><input type="date" name="from" defaultValue={sp.from} className={fieldCls} /></label>
        <label><span className={labelCls}>To</span><input type="date" name="to" defaultValue={sp.to} className={fieldCls} /></label>
        <label><span className={labelCls}>SR</span>
          <select name="sr" defaultValue={sp.sr ?? ""} className={fieldCls}><option value="">All</option>{(srs ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        </label>
        <label><span className={labelCls}>Route</span>
          <select name="route" defaultValue={sp.route ?? ""} className={fieldCls}><option value="">All</option>{(routes ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
        </label>
        <label><span className={labelCls}>Retailer</span><input name="q" defaultValue={sp.q} placeholder="Code or name" className={fieldCls} /></label>
      </FilterBar>
      <DataTable
        rows={rows}
        empty="No sales match. Numbering starts at INV-2026-00001."
        cols={[
          { label: "Invoice", get: (r) => <Link href={r.status === "draft" ? `/erp/sales/${r.id}/edit` : `/erp/sales/${r.id}`} className="font-bold text-forest-800 hover:underline">{r.invoice_no}</Link> },
          { label: "Date", get: (r) => dateLabel(r.date) },
          { label: "Type", get: (r) => TYPE[r.type] ?? r.type },
          { label: "DSR / SR", get: (r) => r.dsr?.name ?? r.sr?.name ?? "—" },
          { label: "Retailer", get: (r) => (r.retailer ? `${r.retailer.code} - ${r.retailer.name}` : "—") },
          { label: "Total", right: true, get: (r) => money(r.total) },
          { label: "Payable", right: true, get: (r) => money(r.payable) },
          { label: "Paid", right: true, get: (r) => money(r.paid) },
          { label: "Due", right: true, get: (r) => <b className={Number(r.payable) - Number(r.paid) > 0.005 ? "text-red-600" : "text-forest-700"}>{money(Number(r.payable) - Number(r.paid))}</b> },
          { label: "Status", get: (r) => <Badge tone={r.status === "finalized" ? "lime" : "grey"}>{r.status}</Badge> },
        ]}
      />
      <Pager page={page} pages={Math.ceil((count ?? 0) / PAGE)} href={qs} />
    </div>
  );
}
