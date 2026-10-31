import Link from "next/link";
import { DataTable, Stat, dateLabel, money } from "@/components/erp/ui";
import { loadRetailers, selectAll } from "@/lib/erp/data";
import type { PartyType } from "@/lib/erp/reports";
import { n, rows, total, type Ctx } from "./shared";

type Bal = { party_id: number; opening: number; debit: number; credit: number };
type Line = { date: string; voucher_no: string; narration: string | null; source: string; source_id: number | null; debit: number; credit: number };

export const PARTY_KEYS = ["retailer", "sr", "dsr", "supplier"].flatMap((t) => [`${t}-statement`, `${t}-balance`]);

/** Names for a party type, keyed by id (retailers as "code - name"). */
export async function partyNames(c: Ctx, type: PartyType) {
  if (type === "retailer") return new Map((await loadRetailers(c.supabase, true)).map((r) => [r.id, `${r.code} - ${r.name}`]));
  if (type === "supplier") return new Map(rows<{ id: number; name: string }>(await c.supabase.from("erp_suppliers").select("id, name")).map((r) => [r.id, r.name]));
  return new Map(rows<{ id: number; name: string }>(await c.supabase.from("erp_staff").select("id, name").eq("kind", type)).map((r) => [r.id, r.name]));
}

// Suppliers carry credit balances (we owe them), so their columns are flipped to read as positive.
const labels = (t: PartyType) =>
  t === "supplier" ? { up: "Purchases", down: "Payments", bal: "Payable" } : { up: t === "retailer" ? "Sales" : "Net receivable", down: "Collections", bal: "Due" };

const sourceHref = (l: Line) => (l.source === "sale" && l.source_id ? `/admin/business/sales/${l.source_id}` : l.source === "erp_goods_receipts" && l.source_id ? `/admin/business/receive/${l.source_id}` : null);

export async function PartyReport(c: Ctx) {
  const type = c.key.split("-")[0] as PartyType;
  const sign = type === "supplier" ? -1 : 1;
  const L = labels(type);
  const up = (b: { debit: number; credit: number }) => n(type === "supplier" ? b.credit : b.debit);
  const down = (b: { debit: number; credit: number }) => n(type === "supplier" ? b.debit : b.credit);

  if (c.key.endsWith("-balance")) {
    const [bal, names] = await Promise.all([
      selectAll<Bal>((a, b) => c.supabase.rpc("erp_rpt_party", { p_type: type, p_from: c.from, p_to: c.to }).order("party_id").range(a, b) as never),
      partyNames(c, type),
    ]);
    const data = bal
      .map((b) => ({ ...b, name: names.get(b.party_id) ?? `#${b.party_id}`, open: sign * n(b.opening), close: sign * (n(b.opening) + n(b.debit) - n(b.credit)) }))
      .filter((b) => Math.abs(b.open) > 0.005 || Math.abs(b.close) > 0.005 || up(b) || down(b))
      .sort((a, b) => b.close - a.close);
    return (
      <DataTable
        rows={data}
        empty="No balances in this period."
        cols={[
          { label: "Name", get: (r) => <Link href={`/admin/business/reports/${type}-statement?party=${r.party_id}&from=${c.from}&to=${c.to}`} className="font-bold text-forest-800 hover:underline">{r.name}</Link> },
          { label: "Opening", right: true, get: (r) => money(r.open) },
          { label: L.up, right: true, get: (r) => money(up(r)) },
          { label: L.down, right: true, get: (r) => money(down(r)) },
          { label: L.bal, right: true, get: (r) => <b className={r.close < -0.005 ? "text-amber-700" : ""}>{money(r.close)}</b> },
        ]}
        foot={["Total", money(total(data, (r) => r.open)), money(total(data, up)), money(total(data, down)), money(total(data, (r) => r.close))]}
      />
    );
  }

  if (!c.partyId) return <p className="rounded-2xl bg-white p-10 text-center text-ink-600 shadow-card">Pick a {type === "sr" || type === "dsr" ? type.toUpperCase() : type} above to see the statement.</p>;
  const [openRes, lines] = await Promise.all([
    c.supabase.rpc("erp_rpt_party", { p_type: type, p_from: c.from, p_to: c.to }).eq("party_id", c.partyId),
    selectAll<Line>((a, b) => c.supabase.rpc("erp_rpt_party_ledger", { p_type: type, p_id: c.partyId, p_from: c.from, p_to: c.to }).range(a, b) as never),
  ]);
  const opening = sign * n(rows<Bal>(openRes)[0]?.opening);
  let run = opening;
  const data = lines.map((l) => ({ ...l, run: (run += sign * (n(l.debit) - n(l.credit))) }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Opening" value={money(opening)} />
        <Stat label={L.up} value={money(total(lines, up))} />
        <Stat label={L.down} value={money(total(lines, down))} />
        <Stat label={`Closing ${L.bal.toLowerCase()}`} value={money(run)} tone="dark" />
      </div>
      <DataTable
        rows={data}
        empty="No entries in this period."
        cols={[
          { label: "Date", get: (l) => dateLabel(l.date) },
          { label: "Voucher", get: (l) => { const h = sourceHref(l); return h ? <Link href={h} className="font-bold text-forest-800 hover:underline">{l.voucher_no}</Link> : <b>{l.voucher_no}</b>; } },
          { label: "Particulars", get: (l) => l.narration ?? "—" },
          { label: L.up, right: true, get: (l) => (up(l) ? money(up(l)) : "") },
          { label: L.down, right: true, get: (l) => (down(l) ? money(down(l)) : "") },
          { label: "Balance", right: true, get: (l) => <b>{money(l.run)}</b> },
        ]}
        foot={["", "", "Total", money(total(lines, up)), money(total(lines, down)), money(run)]}
      />
    </div>
  );
}
