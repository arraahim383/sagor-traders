import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PrintButton } from "@/components/erp/PrintButton";
import { FilterBar, PageHeader, dateLabel, fieldCls, labelCls, monthStart, today } from "@/components/erp/ui";
import { AccountsReport, ACCOUNT_KEYS } from "@/components/erp/reports/accounts";
import { PARTY_KEYS, PartyReport, partyNames } from "@/components/erp/reports/parties";
import { PURCHASE_KEYS, PurchaseReport } from "@/components/erp/reports/purchase";
import { SALES_KEYS, SalesReport } from "@/components/erp/reports/sales";
import type { Ctx } from "@/components/erp/reports/shared";
import { STAFF_KEYS, StaffReport } from "@/components/erp/reports/staff";
import { STOCK_KEYS, StockReport } from "@/components/erp/reports/stock";
import { requireErp } from "@/lib/erp/auth";
import { findReport } from "@/lib/erp/reports";

export async function generateMetadata({ params }: { params: Promise<{ report: string }> }) {
  return { title: findReport((await params).report)?.label ?? "Report" };
}

type SP = { from?: string; to?: string; date?: string; month?: string; party?: string; sr?: string; route?: string };

export default async function ReportPage({ params, searchParams }: { params: Promise<{ report: string }>; searchParams: Promise<SP> }) {
  const def = findReport((await params).report);
  if (!def) notFound();
  const sp = await searchParams;
  const { supabase } = await requireErp();
  const filter = def.filter ?? "range";

  const month = sp.month ? `${sp.month.slice(0, 7)}-01` : monthStart();
  const end = new Date(`${month}T00:00:00Z`);
  end.setUTCMonth(end.getUTCMonth() + 1);
  end.setUTCDate(0);
  const monthEnd = end.toISOString().slice(0, 10);
  const day = sp.date || today();
  const from = filter === "date" ? day : sp.from || monthStart();
  const to = filter === "date" ? day : sp.to || today();

  const ctx: Ctx = { supabase, key: def.key, from, to, month, monthEnd, sr: Number(sp.sr) || undefined, route: Number(sp.route) || undefined };
  const [srs, routes] = def.extra
    ? await Promise.all([supabase.from("erp_staff").select("id, name").eq("kind", "sr").order("name"), supabase.from("erp_routes").select("id, name").order("name")])
    : [{ data: [] }, { data: [] }];
  let options: { id: number; name: string }[] = [];
  if (def.party) {
    const names = await partyNames(ctx, def.party);
    options = [...names.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    // Retailers can be typed by code or picked; anything else picks by id.
    const raw = (sp.party ?? "").trim();
    const hit = options.find((o) => String(o.id) === raw) ?? (def.party === "retailer" ? options.find((o) => o.name.startsWith(`${raw} - `) || o.name === raw) : undefined);
    ctx.partyId = hit?.id;
  }
  const partyName = options.find((o) => o.id === ctx.partyId)?.name;

  const body = SALES_KEYS.includes(def.key) ? SalesReport(ctx)
    : PURCHASE_KEYS.includes(def.key) ? PurchaseReport(ctx)
    : STOCK_KEYS.includes(def.key) ? StockReport(ctx)
    : PARTY_KEYS.includes(def.key) ? PartyReport(ctx)
    : ACCOUNT_KEYS.includes(def.key) ? AccountsReport(ctx)
    : STAFF_KEYS.includes(def.key) ? StaffReport(ctx)
    : null;
  if (!body) notFound();

  const period =
    filter === "none" ? `As of ${dateLabel(today())}`
    : filter === "date" ? dateLabel(day)
    : filter === "month" ? new Date(`${month}T00:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : filter === "asOf" ? `As of ${dateLabel(to)}`
    : `${dateLabel(from)} – ${dateLabel(to)}`;

  return (
    <div className="mx-auto max-w-[1400px]">
      <Link href="/erp/reports" className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-forest-700 print:hidden"><ChevronLeft className="size-4" /> All reports</Link>
      <PageHeader eyebrow={`Reports · ${def.group}`} title={def.label}>
        <PrintButton />
      </PageHeader>
      <p className="-mt-4 mb-5 text-sm font-semibold text-ink-600">M/S Sagor Traders · {period}{partyName ? ` · ${partyName}` : ""}</p>
      {filter !== "none" && (
        <div className="print:hidden">
          <FilterBar>
            {filter === "range" && (
              <>
                <label><span className={labelCls}>From</span><input type="date" name="from" defaultValue={from} className={fieldCls} /></label>
                <label><span className={labelCls}>To</span><input type="date" name="to" defaultValue={to} className={fieldCls} /></label>
              </>
            )}
            {filter === "asOf" && <label><span className={labelCls}>As of</span><input type="date" name="to" defaultValue={to} className={fieldCls} /></label>}
            {filter === "date" && <label><span className={labelCls}>Date</span><input type="date" name="date" defaultValue={day} className={fieldCls} /></label>}
            {filter === "month" && <label><span className={labelCls}>Month</span><input type="month" name="month" defaultValue={month.slice(0, 7)} className={fieldCls} /></label>}
            {def.extra?.includes("sr") && (
              <label><span className={labelCls}>SR</span>
                <select name="sr" defaultValue={sp.sr ?? ""} className={fieldCls}><option value="">All</option>{(srs.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
              </label>
            )}
            {def.extra?.includes("route") && (
              <label><span className={labelCls}>Route</span>
                <select name="route" defaultValue={sp.route ?? ""} className={fieldCls}><option value="">All</option>{(routes.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
              </label>
            )}
            {def.party === "retailer" && (
              <label className="min-w-64 flex-1">
                <span className={labelCls}>Retailer (type code or name)</span>
                <input name="party" list="party-options" defaultValue={partyName ?? sp.party ?? ""} className={fieldCls} />
                <datalist id="party-options">{options.map((o) => <option key={o.id} value={o.name} />)}</datalist>
              </label>
            )}
            {def.party && def.party !== "retailer" && (
              <label className="min-w-56">
                <span className={labelCls}>{def.party === "supplier" ? "Supplier" : def.party.toUpperCase()}</span>
                <select name="party" defaultValue={ctx.partyId ?? ""} className={fieldCls}>
                  <option value="">—</option>
                  {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </label>
            )}
          </FilterBar>
        </div>
      )}
      {await body}
    </div>
  );
}
