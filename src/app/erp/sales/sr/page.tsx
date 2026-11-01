import Link from "next/link";
import { Badge, DataTable, FilterBar, Notice, PageHeader, fieldCls, labelCls, money, today } from "@/components/erp/ui";
import { requireErp } from "@/lib/erp/auth";
import { partyBalances, selectAll } from "@/lib/erp/data";

export const metadata = { title: "SR sales create" };

type R = { id: number; code: string; name: string; mobile: string | null; owner_name: string | null };

/** Rushda's SR order session: pick SR + route + day, then take one order per shop on that route. */
export default async function SrSalesCreate({ searchParams }: { searchParams: Promise<{ sr?: string; route?: string; date?: string }> }) {
  const sp = await searchParams;
  const date = sp.date || today();
  const { supabase } = await requireErp();
  const [{ data: srs }, { data: routes }] = await Promise.all([
    supabase.from("erp_staff").select("id, name, route_id").eq("kind", "sr").eq("active", true).order("name"),
    supabase.from("erp_routes").select("id, name").order("name"),
  ]);
  const sr = (srs ?? []).find((s) => String(s.id) === sp.sr);
  const routeId = sp.route || (sr?.route_id ? String(sr.route_id) : "");
  const route = (routes ?? []).find((r) => String(r.id) === routeId);

  let shops: (R & { balance: number; orders: { id: number; invoice_no: string; status: string; total: number }[] })[] = [];
  if (sr && route) {
    const list = await selectAll<R>((a, b) => supabase.from("erp_retailers").select("id, code, name, mobile, owner_name").eq("route_id", route.id).eq("active", true).order("code").range(a, b));
    const ids = list.map((r) => r.id);
    const [bal, { data: orders }] = await Promise.all([
      partyBalances(supabase, "retailer", ids),
      supabase.from("erp_sales_orders").select("id, invoice_no, status, total, retailer_id").eq("sr_id", sr.id).eq("date", date).in("retailer_id", ids.length ? ids : [-1]),
    ]);
    shops = list.map((r) => ({ ...r, balance: bal.get(r.id) ?? 0, orders: (orders ?? []).filter((o) => o.retailer_id === r.id) }));
  }
  const taken = shops.filter((s) => s.orders.length).length;
  const sessionTotal = shops.reduce((s, r) => s + r.orders.reduce((t, o) => t + Number(o.total), 0), 0);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Sales & Order" title="SR sales create" />
      <FilterBar>
        <label><span className={labelCls}>SR</span>
          <select name="sr" defaultValue={sp.sr ?? ""} required className={fieldCls}><option value="">— Select SR —</option>{(srs ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        </label>
        <label><span className={labelCls}>Route</span>
          <select name="route" defaultValue={routeId} className={fieldCls}><option value="">SR&apos;s usual route</option>{(routes ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
        </label>
        <label><span className={labelCls}>Date</span><input type="date" name="date" defaultValue={date} className={fieldCls} /></label>
      </FilterBar>
      {!sr && <Notice tone="ok">Pick an SR to start the day&apos;s order session. The route fills in from the SR&apos;s usual route.</Notice>}
      {sr && !route && <Notice tone="error">{sr.name} has no usual route. Pick a route.</Notice>}
      {sr && route && (
        <>
          <p className="mb-3 text-sm font-semibold text-ink-600">
            {sr.name} · {route.name} · {shops.length} shops · orders taken at {taken} · session total {money(sessionTotal)}
          </p>
          <DataTable
            rows={shops}
            empty="No active retailers on this route."
            cols={[
              { label: "Code", get: (r) => r.code },
              { label: "Shop", get: (r) => <b>{r.name}</b> },
              { label: "Owner", get: (r) => r.owner_name ?? "—" },
              { label: "Mobile", get: (r) => r.mobile ?? "—" },
              { label: "Balance", right: true, get: (r) => money(r.balance) },
              {
                label: "Today",
                get: (r) =>
                  r.orders.length ? (
                    <span className="flex flex-wrap gap-1">
                      {r.orders.map((o) => (
                        <Link key={o.id} href={o.status === "draft" ? `/erp/sales/${o.id}/edit` : `/erp/sales/${o.id}`}>
                          <Badge tone={o.status === "finalized" ? "lime" : "amber"}>{o.invoice_no} · {money(o.total, 0)}</Badge>
                        </Link>
                      ))}
                    </span>
                  ) : "—",
              },
              {
                label: "",
                get: (r) => (
                  <Link href={`/erp/sales/new?type=dsr&sr=${sr.id}&retailer=${r.id}`} className="rounded-lg bg-forest-900 px-3 py-1.5 text-xs font-bold text-white print:hidden">
                    Take order
                  </Link>
                ),
              },
            ]}
          />
          <p className="mt-3 text-xs text-ink-400">Each order becomes its own invoice charged to the SR, with the shop recorded on it. Save as draft while taking orders; drafts show under Delivery pending until finalized.</p>
        </>
      )}
    </div>
  );
}
