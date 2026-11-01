"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, Gift, Search, X } from "lucide-react";
import { grnTotals, purchaseLine, purchasePromoLines } from "@/lib/erp/purchase";
import type { PromoState } from "@/lib/erp/sales";
import type { OrderWideOffer, Promo } from "@/lib/erp/types";
import { int, num } from "@/lib/erp/money";
import type { CashAccount } from "@/lib/erp/accounting";
import type { PostResult, PurchaseInput } from "@/lib/erp/purchase-payload";
import { cn } from "@/lib/utils";
import { cellCls, fieldCls, labelCls } from "./ui";

export type PurchaseProduct = { id: number; name: string; supplierId: number | null; per: number; buy: number; sale: number; stock: number };
export type OpenPO = { id: number; poNo: string; supplierId: number; lines: { productId: number; remaining: number; buy: number }[] };
type Line = { carton: number; piece: number; free: number; buy: string; sale: string };

const fmt = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
const ACCOUNTS: { key: CashAccount; label: string }[] = [
  { key: "cash", label: "Cash" },
  { key: "bank", label: "Bank" },
  { key: "bkash", label: "bKash-01777940795" },
  { key: "nagad", label: "Nagad-01777940795" },
];

/** Purchase order and goods receive share one form; goods receive adds free qty, sale price and payment. */
export function PurchaseForm({
  mode,
  suppliers,
  products,
  openPOs = [],
  promos,
  onSave,
}: {
  mode: "po" | "grn";
  suppliers: { id: number; name: string; balance: number }[];
  products: PurchaseProduct[];
  openPOs?: OpenPO[];
  /** Live purchase offers (applies to "purchase" or "both"). */
  promos?: { byProduct: [number, Promo][]; orderWide: OrderWideOffer[] };
  onSave: (i: PurchaseInput) => Promise<PostResult>;
}) {
  const grn = mode === "grn";
  const [date, setDate] = useState(() => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date()));
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [poId, setPoId] = useState<number | null>(null);
  const [remark, setRemark] = useState("");
  const [q, setQ] = useState("");
  const [lines, setLines] = useState<Record<number, Line>>({});
  const [commission, setCommission] = useState("");
  const [transport, setTransport] = useState("");
  const [paid, setPaid] = useState("");
  const [fullPaid, setFullPaid] = useState(false);
  const [account, setAccount] = useState<CashAccount>("cash");
  const [payMode, setPayMode] = useState("Cash");
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [saving, start] = useTransition();
  const [promo, setPromo] = useState<PromoState>({ selected: {}, overrides: {}, declined: new Set() });
  const byProduct = useMemo(() => new Map(promos?.byProduct ?? []), [promos]);

  const supplier = suppliers.find((s) => s.id === supplierId);
  // Supplier ledger is credit-positive when we owe them; a debit balance is money paid in advance.
  const advance = Math.max(0, supplier?.balance ?? 0);
  const list = useMemo(() => products.filter((p) => p.supplierId === supplierId && (!q || p.name.toLowerCase().includes(q.toLowerCase()))), [products, supplierId, q]);
  const line = (p: PurchaseProduct): Line => lines[p.id] ?? { carton: 0, piece: 0, free: 0, buy: String(p.buy), sale: String(p.sale) };
  const calc = (p: PurchaseProduct) => {
    const l = line(p);
    return purchaseLine({ carton: l.carton, piece: l.piece, per: p.per, buyPrice: num(l.buy), freeQty: l.free });
  };
  const entered = products.filter((p) => lines[p.id]);
  const subTotal = entered.reduce((s, p) => s + calc(p).subtotal, 0);
  const totals = grnTotals(subTotal, num(commission), num(transport), num(paid), fullPaid, advance);
  // Offers apply to a PO, or to a goods receive that isn't against a PO.
  const promoLines = grn && poId ? [] : purchasePromoLines(entered.map((p) => ({ productId: p.id, qty: calc(p).qty, subtotal: calc(p).subtotal })), byProduct, promos?.orderWide ?? [], promo);
  const set = (p: PurchaseProduct, patch: Partial<Line>) => setLines((x) => ({ ...x, [p.id]: { ...line(p), ...patch } }));

  function pickPO(id: number | null) {
    setPoId(id);
    const po = openPOs.find((x) => x.id === id);
    if (!po) return;
    setSupplierId(po.supplierId);
    const next: Record<number, Line> = {};
    for (const l of po.lines) {
      const p = products.find((x) => x.id === l.productId);
      if (p && l.remaining > 0) next[p.id] = { carton: Math.floor(l.remaining / p.per), piece: l.remaining % p.per, free: 0, buy: String(l.buy), sale: String(p.sale) };
    }
    setLines(next);
  }

  function submit() {
    if (!supplierId) return setMsg({ tone: "error", text: "Select a supplier." });
    const payloadLines = entered.map((p) => {
      const l = line(p);
      return { productId: p.id, carton: l.carton, piece: l.piece, free: l.free, buy: num(l.buy), sale: num(l.sale) };
    });
    start(async () => {
      const freeLines = promoLines.map((l) => ({ productId: l.selected_product_id, qty: l.qty }));
      const res = await onSave({ mode, date, supplierId, invoiceNo, poId, remark, lines: payloadLines, freeLines, commission: num(commission), transport: num(transport), paid: num(paid), fullPaid, account, payMode });
      if (!res.ok) return setMsg({ tone: "error", text: res.error });
      setMsg({ tone: "ok", text: `${res.number} saved${grn ? " — stock received and books posted" : ""}.` });
      setLines({});
      setPromo({ selected: {}, overrides: {}, declined: new Set() });
      setCommission("");
      setTransport("");
      setPaid("");
      setFullPaid(false);
      setInvoiceNo("");
      setPoId(null);
      setRemark("");
    });
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-leaf-600">Purchase</p>
        <h1 className="text-3xl font-extrabold tracking-[-0.02em] text-forest-900">{grn ? "Goods receive" : "New purchase order"}</h1>
      </div>
      {msg && (
        <p role={msg.tone === "error" ? "alert" : "status"} className={cn("mb-5 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold", msg.tone === "ok" ? "bg-lime-100 text-forest-800" : "bg-red-50 text-red-700")}>
          {msg.tone === "ok" && <CheckCircle2 className="size-4" />} {msg.text}
        </p>
      )}

      <section className="grid gap-4 rounded-2xl bg-white p-5 shadow-card sm:grid-cols-2 lg:grid-cols-4">
        <label><span className={labelCls}>Date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldCls} /></label>
        <label>
          <span className={labelCls}>Supplier</span>
          <select value={supplierId ?? ""} onChange={(e) => { setSupplierId(e.target.value ? Number(e.target.value) : null); setLines({}); setPoId(null); }} className={fieldCls}>
            <option value="">— Select supplier —</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        {grn ? (
          <>
            <label><span className={labelCls}>Supplier invoice #</span><input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className={fieldCls} /></label>
            <label>
              <span className={labelCls}>Against purchase order</span>
              <select value={poId ?? ""} onChange={(e) => pickPO(e.target.value ? Number(e.target.value) : null)} className={fieldCls}>
                <option value="">— None —</option>
                {openPOs.filter((p) => !supplierId || p.supplierId === supplierId).map((p) => <option key={p.id} value={p.id}>{p.poNo}</option>)}
              </select>
            </label>
          </>
        ) : (
          <label className="sm:col-span-2"><span className={labelCls}>Remark</span><input value={remark} onChange={(e) => setRemark(e.target.value)} className={fieldCls} /></label>
        )}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
        <section className="min-w-0 rounded-2xl bg-white shadow-card">
          <div className="border-b border-ink-900/5 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={supplierId ? "Search products" : "Select a supplier first"} className={`${fieldCls} pl-9`} />
            </div>
          </div>
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-mint-50 text-left text-[11px] font-bold uppercase tracking-wider text-ink-600">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-2 py-3 text-center">Carton</th>
                  <th className="px-2 py-3 text-center">Piece</th>
                  <th className="px-2 py-3 text-center">Qty</th>
                  {grn && <th className="px-2 py-3 text-center">Free</th>}
                  <th className="px-2 py-3 text-right">Buy price</th>
                  {grn && <th className="px-2 py-3 text-right">Sale price</th>}
                  <th className="px-4 py-3 text-right">Sub total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-900/5">
                {list.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-ink-600">{supplierId ? "No products for this supplier." : "Select a supplier to load its products."}</td></tr>}
                {list.map((p) => {
                  const l = line(p);
                  const c = calc(p);
                  return (
                    <tr key={p.id} className={lines[p.id] ? "bg-lime-100/40" : ""}>
                      <td className="px-4 py-2"><p className="font-semibold">{p.name}</p><p className="text-[11px] text-ink-400">In stock {p.stock} · 1 carton = {p.per} pcs</p></td>
                      <td className="px-1 py-2 text-center"><input type="number" min={0} value={l.carton || ""} placeholder="0" onChange={(e) => set(p, { carton: int(e.target.value) })} className={cellCls} /></td>
                      <td className="px-1 py-2 text-center"><input type="number" min={0} value={l.piece || ""} placeholder="0" onChange={(e) => set(p, { piece: int(e.target.value) })} className={cellCls} /></td>
                      <td className="px-2 py-2 text-center font-bold text-forest-700">{c.qty}</td>
                      {grn && <td className="px-1 py-2 text-center"><input type="number" min={0} step={0.001} value={l.free || ""} placeholder="0" onChange={(e) => set(p, { free: num(e.target.value) })} className={cellCls} /></td>}
                      <td className="px-1 py-2 text-right"><input type="number" min={0} step={0.0001} value={l.buy} onChange={(e) => set(p, { buy: e.target.value })} className={cn(cellCls, "w-24 text-right")} /></td>
                      {grn && <td className="px-1 py-2 text-right"><input type="number" min={0} step={0.0001} value={l.sale} onChange={(e) => set(p, { sale: e.target.value })} className={cn(cellCls, "w-24 text-right")} /></td>}
                      <td className="px-4 py-2 text-right font-bold tabular-nums">{fmt(c.subtotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          {promoLines.length > 0 && (
            <section className="space-y-3 rounded-2xl bg-white p-5 shadow-card">
              <p className="flex items-center gap-2 text-sm font-extrabold text-forest-800"><Gift className="size-4" /> Free from offers</p>
              {promoLines.map((l) => (
                <div key={l.key} className="flex items-center gap-2 text-sm">
                  {l.free_options.length > 1 ? (
                    <select value={l.selected_product_id} onChange={(e) => setPromo((s) => ({ ...s, selected: { ...s.selected, [l.key]: Number(e.target.value) }, overrides: { ...s.overrides, [l.key]: undefined } }))} className={cn(fieldCls, "flex-1")}>
                      {l.free_options.map((o) => <option key={o.product_id} value={o.product_id}>{o.name}</option>)}
                    </select>
                  ) : (
                    <span className="flex-1 font-semibold">{l.free_options[0].name}</span>
                  )}
                  <input type="number" min={0} value={l.qty} onChange={(e) => setPromo((s) => ({ ...s, overrides: { ...s.overrides, [l.key]: num(e.target.value) } }))} className={cn(cellCls, "w-20")} aria-label="Free qty" />
                  <button onClick={() => setPromo((s) => ({ ...s, declined: new Set(s.declined).add(`${l.key}:${l.multiples}`) }))} aria-label="Remove offer" className="rounded-lg p-1 text-ink-400 hover:bg-red-50 hover:text-red-600"><X className="size-4" /></button>
                </div>
              ))}
              <p className="text-[11px] text-ink-400">Free lines come in at zero cost. Formula qty = times the target is reached × free qty.</p>
            </section>
          )}
          <section className="space-y-3 rounded-2xl bg-white p-5 shadow-card">
            <div className="flex items-baseline justify-between"><span className="text-sm font-bold text-ink-600">Sub total</span><span className="text-2xl font-extrabold tabular-nums text-forest-900">{fmt(totals.subTotal)}</span></div>
            {grn && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <label><span className={labelCls}>Commission</span><input type="number" min={0} value={commission} placeholder="0" onChange={(e) => setCommission(e.target.value)} className={cn(fieldCls, "text-right")} /></label>
                  <label><span className={labelCls}>Transport</span><input type="number" min={0} value={transport} placeholder="0" onChange={(e) => setTransport(e.target.value)} className={cn(fieldCls, "text-right")} /></label>
                </div>
                <div className="flex items-baseline justify-between border-t border-ink-900/5 pt-3"><span className="text-sm font-bold text-ink-600">Payable</span><span className="text-xl font-extrabold tabular-nums">{fmt(totals.payable)}</span></div>
                <div className="flex items-end gap-3">
                  <label className="flex-1"><span className={labelCls}>Paid now</span><input type="number" min={0} value={fullPaid ? totals.paid : paid} readOnly={fullPaid} placeholder="0" onChange={(e) => setPaid(e.target.value)} className={cn(fieldCls, "text-right", fullPaid && "bg-mint-50")} /></label>
                  <label className="mb-2 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={fullPaid} onChange={(e) => setFullPaid(e.target.checked)} className="size-4 accent-forest-700" /> Full</label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label><span className={labelCls}>Pay from</span><select value={account} onChange={(e) => setAccount(e.target.value as CashAccount)} className={fieldCls}>{ACCOUNTS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}</select></label>
                  <label><span className={labelCls}>Mode</span><select value={payMode} onChange={(e) => setPayMode(e.target.value)} className={fieldCls}>{["Cash", "Bkash", "Nagad", "Bank"].map((m) => <option key={m}>{m}</option>)}</select></label>
                </div>
                {totals.advanceApplied > 0 && <p className="flex justify-between text-sm font-semibold text-forest-700"><span>Advance used</span><span>{fmt(totals.advanceApplied)}</span></p>}
                <div className={cn("rounded-xl px-4 py-3 font-extrabold", totals.due > 0.005 ? "bg-red-50 text-red-700" : "bg-mint-50 text-forest-800")}>
                  <div className="flex justify-between"><span>Due to supplier</span><span className="tabular-nums">{fmt(totals.due)}</span></div>
                </div>
              </>
            )}
          </section>
          <button onClick={submit} disabled={saving} className="btn-forest w-full rounded-full px-4 py-3 text-sm font-bold disabled:opacity-50">
            {saving ? "Saving…" : grn ? "Receive goods" : "Save purchase order"}
          </button>
        </aside>
      </div>
    </div>
  );
}
