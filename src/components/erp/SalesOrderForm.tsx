"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, BookOpenCheck, CheckCircle2, PackageX, Plus, Search, Trash2, X } from "lucide-react";
import { computeLine, computePromoLines, damageLine, isCountedLine, mainPaidAmount, orderTotals, overStock, priceWarning, splitRemaining, type LineInput, type PromoState } from "@/lib/erp/sales";
import { isBalanced, postSale, ACCOUNTS, type CashAccount } from "@/lib/erp/accounting";
import { num, int, taka } from "@/lib/erp/money";
import { MODE_ACCOUNT, type SalesOrderInput, type SaveResult } from "@/lib/erp/sales-payload";
import type { ErpProduct, OrderType, OrderWideOffer } from "@/lib/erp/types";
import { cn } from "@/lib/utils";

type Party = { id: number; name: string; balance: number };
type DamageEntry = { noteNo: string; lines: { name: string; qty: number; price: number; subtotal: number; noStock: boolean }[] };

const CASH_ACCOUNTS: { key: CashAccount; label: string }[] = [
  { key: "cash", label: "Cash" },
  { key: "bank", label: "Bank" },
  { key: "bkash", label: "bKash-01777940795" },
  { key: "nagad", label: "Nagad-01777940795" },
];
const DEDUCTIONS = [
  ["commission", "Commission"],
  ["cashClaim", "Cash Claim"],
  ["cashDamage", "Cash Damage"],
  ["transport", "Transport"],
  ["dsrCost", "DSR Cost"],
  ["discount", "Discount"],
] as const;
type DeductionKey = (typeof DEDUCTIONS)[number][0];

const fieldBase =
  "rounded-xl border border-ink-900/10 bg-white px-3 py-2 text-sm text-ink-900 outline-none transition focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/20";
const field = `w-full ${fieldBase}`;
const cell =
  "w-[4.25rem] rounded-lg border border-ink-900/10 bg-white px-1.5 py-1 text-center text-sm tabular-nums outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none";
const label = "mb-1 block text-xs font-bold uppercase tracking-wider text-ink-600";

const fmt = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

export function SalesOrderForm({
  products,
  srs,
  dsrs,
  retailers,
  orderWideOffers = [],
  onSave,
  dataNote = "Preview · stock & prices from Rushda, 31 Oct 2026",
  initial,
}: {
  products: ErpProduct[];
  srs: Party[];
  dsrs: Party[];
  retailers: Party[];
  orderWideOffers?: OrderWideOffer[];
  /** When given, orders are saved for real; without it the screen only previews the books entry. */
  onSave?: (input: SalesOrderInput) => Promise<SaveResult>;
  dataNote?: string;
  /** A saved draft being reopened. */
  initial?: SalesOrderInput & { orderId: number; invoiceNo: string };
}) {
  const [saving, startSaving] = useTransition();
  const [saved, setSaved] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<number | null>(initial?.orderId ?? null);
  const [date, setDate] = useState(() => initial?.date ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date()));
  const [type, setType] = useState<OrderType>(initial?.type ?? "dsr");
  const [srId, setSrId] = useState(initial?.srId ? String(initial.srId) : "");
  const [dsrId, setDsrId] = useState(initial?.dsrId ? String(initial.dsrId) : "");
  const [retailerId, setRetailerId] = useState(initial?.retailerId ? String(initial.retailerId) : "");
  const [supplier, setSupplier] = useState("");
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [lines, setLines] = useState<Record<number, LineInput>>(() =>
    Object.fromEntries((initial?.lines ?? []).map(({ productId, ...l }) => [productId, l])),
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [deductions, setDeductions] = useState<Record<DeductionKey, string>>(() => {
    const d = initial?.deductions;
    const s = (n?: number) => (n ? String(n) : "");
    return { commission: s(d?.commission), cashClaim: s(d?.cashClaim), cashDamage: s(d?.cashDamage), transport: s(d?.transport), dsrCost: s(d?.dsrCost), discount: s(d?.discount) };
  });
  const [paidInput, setPaidInput] = useState(initial?.paidInput ? String(initial.paidInput) : "");
  const [fullPaid, setFullPaid] = useState(false);
  const [mode, setMode] = useState(initial?.paymentMode && initial.paymentMode !== "Split" ? initial.paymentMode : "Cash");
  const [depositAccount, setDepositAccount] = useState<"" | CashAccount>("");
  const [split, setSplit] = useState<{ id: number; account: CashAccount; amount: string }[] | null>(
    initial?.split?.length ? initial.split.map((s, i) => ({ id: i + 1, account: s.account, amount: String(s.amount) })) : null,
  );
  const [remark, setRemark] = useState(initial?.remark ?? "");
  const [promo, setPromo] = useState<PromoState>({ selected: {}, overrides: {}, declined: new Set() });
  const [damageEntries, setDamageEntries] = useState<DamageEntry[]>([]);
  const [damageOpen, setDamageOpen] = useState(false);
  const [preview, setPreview] = useState<null | "draft" | "finalized">(null);

  const suppliers = useMemo(() => [...new Set(products.map((p) => p.sup))].sort(), [products]);
  const categories = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))].sort(), [products]);
  const visible = products.filter(
    (p) =>
      (!supplier || p.sup === supplier) &&
      (!category || p.category === category) &&
      (!q || p.name.toLowerCase().includes(q.toLowerCase()) || String(p.barcode ?? "").toLowerCase().includes(q.toLowerCase())),
  );

  const lineFor = (p: ErpProduct) => computeLine(p, lines[p.id] ?? { carton: 0, piece: 0, ret: 0, dmg: 0, freeQty: 0 });
  // Every entered line counts, even ones hidden by the filters — same as Rushda.
  const entered = products.filter((p) => lines[p.id]).map(lineFor).filter(isCountedLine);
  const promoLines = computePromoLines(entered, orderWideOffers, promo);
  const damageTotal = damageEntries.reduce((s, e) => s + e.lines.reduce((t, l) => t + l.subtotal, 0), 0);
  const d = Object.fromEntries(DEDUCTIONS.map(([k]) => [k, num(deductions[k]) + (k === "cashDamage" ? damageTotal : 0)])) as Record<DeductionKey, number>;
  const totals = orderTotals(entered, d, num(paidInput), fullPaid);
  const mainPaid = mainPaidAmount(totals.paid, 0);
  const splitState = split ? splitRemaining(mainPaid, split.map((r) => ({ amount: num(r.amount) }))) : null;
  const partyName =
    type === "direct" ? retailers.find((r) => String(r.id) === retailerId)?.name : (srs.find((s) => String(s.id) === srId) ?? dsrs.find((s) => String(s.id) === dsrId))?.name;
  const partyBalance = (list: Party[], id: string) => list.find((x) => String(x.id) === id)?.balance ?? 0;

  function update(p: ErpProduct, patch: Partial<LineInput>) {
    setLines((prev) => ({ ...prev, [p.id]: { ...(prev[p.id] ?? { carton: 0, piece: 0, ret: 0, dmg: 0, freeQty: 0 }), ...patch } }));
  }
  /** Rushda clears the box that pushed the line over stock. */
  function checkStock(p: ErpProduct, key: keyof LineInput) {
    const l = lineFor(p);
    if (overStock(l)) {
      setNotice(`"${p.name}": only ${p.stock} in stock. Quantity cleared.`);
      update(p, { [key]: 0 });
    }
  }

  const stockErrors = [
    ...entered.filter(overStock).map((l) => `"${l.product.name}": need ${l.soldQty + l.freeQty}, only ${l.product.stock} in stock`),
    ...promoLines.flatMap((pl) => {
      const fp = products.find((x) => x.id === pl.selected_product_id);
      return fp && pl.qty > fp.stock ? [`"${fp.name}" (free item): need ${pl.qty}, only ${fp.stock} in stock`] : [];
    }),
  ];
  const partyMissing = type === "direct" ? !retailerId : !dsrId && !srId;

  function submit(status: "draft" | "finalized") {
    if (entered.length + promoLines.length === 0) return setNotice("Add at least one line with quantity.");
    if (stockErrors.length) return setNotice("Insufficient stock: " + stockErrors.join("; "));
    if (split && !splitState?.ok) return setNotice(`Split payment amounts must add up to the main paid amount. Remaining: ${splitState?.remaining}`);
    setNotice(null);
    if (!onSave) return setPreview(status);
    const input: SalesOrderInput = {
      orderId,
      status,
      date,
      type,
      srId: srId ? Number(srId) : null,
      dsrId: dsrId ? Number(dsrId) : null,
      retailerId: retailerId ? Number(retailerId) : null,
      lines: Object.entries(lines).map(([id, l]) => ({ ...l, productId: Number(id) })),
      freeLines: promoLines.map((pl) => ({ productId: pl.selected_product_id, qty: pl.qty })),
      deductions: d,
      paidInput: num(paidInput),
      fullPaid,
      paymentMode: mode,
      depositAccount: depositAccount || null,
      split: split ? split.map((r) => ({ account: r.account, amount: num(r.amount) })) : null,
      remark,
    };
    startSaving(async () => {
      const res = await onSave(input);
      if (!res.ok) return setNotice(res.error);
      setSaved(`${res.invoiceNo} ${res.status === "finalized" ? "finalized — stock issued and books posted" : "saved as draft"}.`);
      if (initial) {
        window.location.href = `/admin/business/sales/${res.orderId}`;
        return;
      }
      setOrderId(null);
      setLines({});
      setDeductions({ commission: "", cashClaim: "", cashDamage: "", transport: "", dsrCost: "", discount: "" });
      setPaidInput("");
      setFullPaid(false);
      setSplit(null);
      setRemark("");
      setDamageEntries([]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  const payments: { account: CashAccount; amount: number }[] = split
    ? split.filter((r) => num(r.amount) > 0).map((r) => ({ account: r.account, amount: num(r.amount) }))
    : totals.paid > 0
      ? [{ account: depositAccount || MODE_ACCOUNT[mode], amount: totals.paid }]
      : [];
  const journal = postSale({
    party: type === "direct" ? "retailer" : srId ? "sr" : "dsr",
    total: totals.total,
    payable: totals.payable,
    cost: entered.reduce((s, l) => s + l.cost, 0),
    deductions: d,
    payments,
  });
  const journalCheck = isBalanced(journal);

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-leaf-600">Sales &amp; Order</p>
          <h1 className="text-3xl font-extrabold tracking-[-0.02em] text-forest-900">{initial ? `Draft ${initial.invoiceNo}` : "New sales order"}</h1>
        </div>
        <p className="rounded-full bg-lime-100 px-3 py-1 text-xs font-bold text-forest-800">{dataNote}</p>
      </div>

      {saved && (
        <div role="status" className="mt-5 flex items-start gap-3 rounded-2xl bg-lime-100 px-4 py-3 text-sm font-semibold text-forest-800 ring-1 ring-leaf-400/40">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span className="flex-1">{saved}</span>
          <button onClick={() => setSaved(null)} aria-label="Dismiss"><X className="size-4" /></button>
        </div>
      )}

      {notice && (
        <div role="alert" className="mt-5 flex items-start gap-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span className="flex-1">{notice}</span>
          <button onClick={() => setNotice(null)} aria-label="Dismiss"><X className="size-4" /></button>
        </div>
      )}

      {/* Header */}
      <section className="mt-6 grid gap-4 rounded-2xl bg-white p-5 shadow-card sm:grid-cols-2 lg:grid-cols-4">
        <label>
          <span className={label}>Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
        </label>
        <label>
          <span className={label}>Type</span>
          <select value={type} onChange={(e) => setType(e.target.value as OrderType)} className={field}>
            <option value="dsr">DSR Sales</option>
            <option value="direct">Direct</option>
            <option value="return">Return</option>
          </select>
        </label>
        {type === "direct" ? (
          <label className="sm:col-span-2">
            <span className={label}>Retailer · balance {fmt(partyBalance(retailers, retailerId))}</span>
            <select value={retailerId} onChange={(e) => setRetailerId(e.target.value)} className={field}>
              <option value="">— Select retailer —</option>
              {retailers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>
        ) : (
          <>
            <label>
              <span className={label}>DSR · balance {fmt(partyBalance(dsrs, dsrId))}</span>
              <select value={dsrId} onChange={(e) => setDsrId(e.target.value)} className={field}>
                <option value="">— Select DSR —</option>
                {dsrs.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </label>
            <label>
              <span className={label}>SR · balance {fmt(partyBalance(srs, srId))}</span>
              <select value={srId} onChange={(e) => setSrId(e.target.value)} className={field}>
                <option value="">— Select SR —</option>
                {srs.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </label>
          </>
        )}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
        {/* Lines */}
        <section className="min-w-0 rounded-2xl bg-white shadow-card">
          <div className="flex flex-wrap gap-3 border-b border-ink-900/5 p-4">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search product or barcode" className={cn(field, "pl-9")} />
            </div>
            <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className={fieldBase}>
              <option value="">All suppliers</option>
              {suppliers.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={fieldBase}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
            {/* Saving extra-damage notes (with their stock returns) comes with the stock module. */}
            {!onSave && (
              <button onClick={() => setDamageOpen(true)} className="inline-flex items-center gap-2 rounded-full border-2 border-forest-800 px-4 py-2 text-sm font-bold text-forest-800 transition hover:bg-mint-50">
                <PackageX className="size-4" /> Extra damage{damageEntries.length ? ` (${damageEntries.reduce((s, e) => s + e.lines.length, 0)})` : ""}
              </button>
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden max-h-[70vh] overflow-auto lg:block">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-mint-50 text-left text-[11px] font-bold uppercase tracking-wider text-ink-600">
                <tr>
                  <th className="px-4 py-3">Description</th>
                  {["Carton", "Piece", "Order qty", "Return", "Damage", "Sold qty", "Free qty", "Price", "Sub total"].map((h) => (
                    <th key={h} className="px-2 py-3 text-center last:text-right last:pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-900/5">
                {visible.map((p) => {
                  const l = lineFor(p);
                  const warn = priceWarning(l);
                  const touched = !!lines[p.id];
                  return (
                    <tr key={p.id} className={cn("align-top", touched && "bg-lime-100/40")}>
                      <td className="max-w-[300px] px-4 py-2.5">
                        <p className="font-semibold text-ink-900">{p.name}</p>
                        <p className={cn("text-[11px]", p.stock <= 0 ? "text-red-500" : "text-ink-400")}>
                          Stock <b>{p.stock}</b> · 1 carton = {p.per || 12} pcs
                        </p>
                        {p.lots.length > 0 && <p className="text-[11px] text-leaf-600">Sale price: {p.lots.map((x) => `${x.qty}@${x.sale}`).join(" + ")}</p>}
                        {warn && <p className="mt-0.5 text-[11px] font-semibold text-amber-600">⚠ {warn}</p>}
                      </td>
                      <td className="px-1 py-2 text-center"><input type="number" min={0} value={l.carton || ""} placeholder="0" onChange={(e) => update(p, { carton: int(e.target.value) })} onBlur={() => checkStock(p, "carton")} className={cell} /></td>
                      <td className="px-1 py-2 text-center"><input type="number" min={0} value={l.piece || ""} placeholder="0" onChange={(e) => update(p, { piece: int(e.target.value) })} onBlur={() => checkStock(p, "piece")} className={cell} /></td>
                      <td className="px-2 py-3 text-center font-bold tabular-nums text-forest-700">{l.orderQty}</td>
                      <td className="px-1 py-2 text-center"><input type="number" min={0} value={l.ret || ""} placeholder="0" onChange={(e) => update(p, { ret: int(e.target.value) })} className={cell} /></td>
                      <td className="px-1 py-2 text-center"><input type="number" min={0} value={l.dmg || ""} placeholder="0" onChange={(e) => update(p, { dmg: int(e.target.value) })} className={cell} /></td>
                      <td className={cn("px-2 py-3 text-center font-bold tabular-nums", l.soldQty > p.stock && "text-red-600")}>{l.soldQty}</td>
                      <td className="px-1 py-2 text-center"><input type="number" min={0} step={0.001} value={l.freeQty || ""} placeholder="0" onChange={(e) => update(p, { freeQty: num(e.target.value) })} onBlur={() => checkStock(p, "freeQty")} className={cell} title="Given free of cost (price 0)" /></td>
                      <td className="px-1 py-2 text-center">
                        <input
                          type="number"
                          min={0}
                          step={0.0001}
                          value={l.price}
                          onChange={(e) => update(p, { price: num(e.target.value), manual: true })}
                          className={cn(cell, "w-[5.5rem] text-right", l.manual && "border-amber-300 bg-amber-50")}
                          title={l.manual ? "Hand-typed price" : "FIFO sale price"}
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums">{fmt(l.subtotal)}</td>
                    </tr>
                  );
                })}
                {promoLines.map((pl) => (
                  <PromoRow key={pl.key} pl={pl} products={products} setPromo={setPromo} desktop />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 p-3 lg:hidden">
            {visible.map((p) => {
              const l = lineFor(p);
              const warn = priceWarning(l);
              return (
                <div key={p.id} className={cn("rounded-2xl p-4 ring-1 ring-ink-900/5", lines[p.id] ? "bg-lime-100/50" : "bg-cream-50")}>
                  <p className="font-bold text-ink-900">{p.name}</p>
                  <p className={cn("mb-3 text-xs", p.stock <= 0 ? "text-red-500" : "text-ink-400")}>Stock {p.stock} · 1 carton = {p.per || 12} pcs</p>
                  {warn && <p className="-mt-2 mb-3 text-xs font-semibold text-amber-600">⚠ {warn}</p>}
                  <div className="grid grid-cols-3 gap-2">
                    <MobileNum label="Carton" value={l.carton} onChange={(v) => update(p, { carton: int(v) })} onBlur={() => checkStock(p, "carton")} />
                    <MobileNum label="Piece" value={l.piece} onChange={(v) => update(p, { piece: int(v) })} onBlur={() => checkStock(p, "piece")} />
                    <div><span className="block text-[10px] font-bold uppercase tracking-wider text-ink-400">Order qty</span><p className="rounded-lg bg-mint-50 py-1.5 text-center font-bold text-forest-700">{l.orderQty}</p></div>
                    <MobileNum label="Return" value={l.ret} onChange={(v) => update(p, { ret: int(v) })} />
                    <MobileNum label="Damage" value={l.dmg} onChange={(v) => update(p, { dmg: int(v) })} />
                    <MobileNum label="Free" value={l.freeQty} onChange={(v) => update(p, { freeQty: num(v) })} onBlur={() => checkStock(p, "freeQty")} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-ink-600">Sold <b className={l.soldQty > p.stock ? "text-red-600" : "text-ink-900"}>{l.soldQty}</b></span>
                    <label className="flex items-center gap-1 text-ink-600">
                      Price
                      <input type="number" step={0.0001} value={l.price} onChange={(e) => update(p, { price: num(e.target.value), manual: true })} className={cn(cell, "w-24 text-right", l.manual && "border-amber-300 bg-amber-50")} />
                    </label>
                  </div>
                  <p className="mt-2 text-right text-sm text-ink-600">Sub total <b className="text-ink-900">{fmt(l.subtotal)}</b></p>
                </div>
              );
            })}
            {promoLines.map((pl) => <PromoRow key={pl.key} pl={pl} products={products} setPromo={setPromo} />)}
          </div>
        </section>

        {/* Summary */}
        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-2xl bg-white p-5 shadow-card">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold text-ink-600">Total</span>
              <span className="text-2xl font-extrabold tabular-nums text-forest-900">{fmt(totals.total)}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {DEDUCTIONS.map(([k, name]) => (
                <label key={k}>
                  <span className={label}>{name}</span>
                  <input
                    type="number"
                    min={0}
                    value={deductions[k]}
                    placeholder="0"
                    onChange={(e) => setDeductions((x) => ({ ...x, [k]: e.target.value }))}
                    className={cn(field, "text-right tabular-nums")}
                  />
                  {k === "cashDamage" && damageTotal > 0 && <span className="mt-0.5 block text-[11px] text-ink-400">+ {fmt(damageTotal)} extra damage</span>}
                </label>
              ))}
            </div>
            <div className="mt-4 flex items-baseline justify-between border-t border-ink-900/5 pt-3">
              <span className="text-sm font-bold text-ink-600">Payable</span>
              <span className="text-xl font-extrabold tabular-nums">{fmt(totals.payable)}</span>
            </div>
            <div className="mt-3 flex items-end gap-3">
              <label className="flex-1">
                <span className={label}>Paid</span>
                <input
                  type="number"
                  min={0}
                  value={fullPaid ? totals.paid : paidInput}
                  readOnly={fullPaid}
                  placeholder="0"
                  onChange={(e) => setPaidInput(e.target.value)}
                  className={cn(field, "text-right tabular-nums", fullPaid && "bg-mint-50")}
                />
              </label>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={fullPaid} onChange={(e) => { setFullPaid(e.target.checked); if (!e.target.checked) setPaidInput(""); }} className="size-4 accent-forest-700" />
                Paid full
              </label>
            </div>
            <div className={cn("mt-4 rounded-xl px-4 py-3", totals.kind === "receive" ? "bg-lime-100 text-forest-800" : totals.kind === "due" ? "bg-red-50 text-red-700" : "bg-mint-50 text-forest-800")}>
              <div className="flex items-baseline justify-between font-extrabold">
                <span>{totals.kind === "receive" ? "Receive" : "Due"}</span>
                <span className="text-xl tabular-nums">{fmt(Math.abs(totals.due))}</span>
              </div>
              {totals.kind !== "settled" && partyName && (
                <p className="mt-0.5 text-xs font-semibold">{totals.kind === "receive" ? `Credited to ${partyName}'s ledger` : `Added to ${partyName}'s ledger as due`}</p>
              )}
            </div>
          </section>

          <section className="space-y-3 rounded-2xl bg-white p-5 shadow-card">
            {!split ? (
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className={label}>Payment mode</span>
                  <select value={mode} onChange={(e) => setMode(e.target.value)} className={field}>
                    {Object.keys(MODE_ACCOUNT).map((m) => <option key={m}>{m}</option>)}
                  </select>
                </label>
                <label>
                  <span className={label}>Deposit account</span>
                  <select value={depositAccount} onChange={(e) => setDepositAccount(e.target.value as CashAccount | "")} className={field}>
                    <option value="">Auto</option>
                    {CASH_ACCOUNTS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
                  </select>
                </label>
              </div>
            ) : (
              <div className="space-y-2">
                {split.map((r) => (
                  <div key={r.id} className="flex gap-2">
                    <select value={r.account} onChange={(e) => setSplit((s) => s!.map((x) => (x.id === r.id ? { ...x, account: e.target.value as CashAccount } : x)))} className={cn(field, "min-w-0 flex-1")}>
                      {CASH_ACCOUNTS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
                    </select>
                    <input type="number" min={0} placeholder="Amount" value={r.amount} onChange={(e) => setSplit((s) => s!.map((x) => (x.id === r.id ? { ...x, amount: e.target.value } : x)))} className={cn(field, "w-28 text-right")} />
                    <button onClick={() => setSplit((s) => s!.filter((x) => x.id !== r.id))} aria-label="Remove" className="text-ink-400 hover:text-red-600"><X className="size-4" /></button>
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm">
                  <button onClick={() => setSplit((s) => [...s!, { id: Date.now(), account: "cash", amount: "" }])} className="inline-flex items-center gap-1 font-bold text-forest-700"><Plus className="size-4" /> Add row</button>
                  <span className={cn("font-bold", splitState?.ok ? "text-forest-700" : "text-red-600")}>Remaining {fmt(splitState?.remaining ?? 0)}</span>
                </div>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={!!split}
                onChange={(e) => setSplit(e.target.checked ? [{ id: 1, account: "cash", amount: "" }, { id: 2, account: "bkash", amount: "" }] : null)}
                className="size-4 accent-forest-700"
              />
              Split receive (part cash + part bKash)
            </label>
            <label>
              <span className={label}>Remark</span>
              <textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={2} className={field} />
            </label>
          </section>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => submit("draft")} disabled={saving} className="rounded-full border-2 border-forest-800 px-4 py-3 text-sm font-bold text-forest-800 transition hover:bg-mint-50 disabled:opacity-50">
              {saving ? "Saving…" : "Save draft"}
            </button>
            <button onClick={() => submit("finalized")} disabled={partyMissing || saving} className="btn-forest rounded-full px-4 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? "Saving…" : "Finalize"}
            </button>
          </div>
          {partyMissing && <p className="text-center text-xs text-ink-400">Pick {type === "direct" ? "a retailer" : "an SR or DSR"} to finalize.</p>}
        </aside>
      </div>

      {damageOpen && (
        <DamageModal
          products={products}
          suppliers={suppliers}
          onClose={() => setDamageOpen(false)}
          onSave={(entry) => {
            setDamageEntries((x) => [...x, entry]);
            setDamageOpen(false);
          }}
          entries={damageEntries}
          onDelete={(i) => setDamageEntries((x) => x.filter((_, j) => j !== i))}
        />
      )}

      {preview && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-forest-950/40 p-4" onClick={() => setPreview(null)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-[28px] bg-white p-6 shadow-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-leaf-600">{preview === "draft" ? "Draft" : "Finalize"} · preview only</p>
                <h2 className="mt-1 flex items-center gap-2 text-xl font-extrabold text-forest-900"><BookOpenCheck className="size-5 text-leaf-600" /> Books entry</h2>
              </div>
              <button onClick={() => setPreview(null)} aria-label="Close"><X className="size-5" /></button>
            </div>
            <p className="mt-2 text-sm text-ink-600">
              {preview === "draft" ? "A draft doesn't touch stock or the books. On finalize, this is what gets posted:" : "Stock is issued oldest-lot first and this journal is posted:"}
            </p>
            <table className="mt-4 w-full text-sm">
              <thead className="text-left text-[11px] font-bold uppercase tracking-wider text-ink-600">
                <tr><th className="pb-2">Account</th><th className="pb-2 text-right">Debit</th><th className="pb-2 text-right">Credit</th></tr>
              </thead>
              <tbody className="divide-y divide-ink-900/5">
                {journal.map((j, i) => (
                  <tr key={i}>
                    <td className="py-2"><span className="text-ink-400">{ACCOUNTS[j.account].code}</span> {ACCOUNTS[j.account].name}</td>
                    <td className="py-2 text-right tabular-nums">{j.debit ? taka(j.debit) : ""}</td>
                    <td className="py-2 text-right tabular-nums">{j.credit ? taka(j.credit) : ""}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="font-extrabold">
                <tr className="border-t-2 border-forest-900/10">
                  <td className="pt-2">Total</td>
                  <td className="pt-2 text-right tabular-nums">{taka(journalCheck.debit)}</td>
                  <td className="pt-2 text-right tabular-nums">{taka(journalCheck.credit)}</td>
                </tr>
              </tfoot>
            </table>
            <p className={cn("mt-4 rounded-xl px-4 py-2 text-sm font-bold", journalCheck.balanced ? "bg-lime-100 text-forest-800" : "bg-red-50 text-red-700")}>
              {journalCheck.balanced ? "✓ Balanced" : `Not balanced — difference of ${journalCheck.difference}`}
            </p>
            <p className="mt-3 text-xs text-ink-400">Saving to the database comes in the next step; nothing is stored yet.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileNum({ label: l, value, onChange, onBlur }: { label: string; value: number; onChange: (v: string) => void; onBlur?: () => void }) {
  return (
    <label>
      <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-400">{l}</span>
      <input type="number" min={0} value={value || ""} placeholder="0" onChange={(e) => onChange(e.target.value)} onBlur={onBlur} className={cn(cell, "w-full py-1.5")} />
    </label>
  );
}

function PromoRow({
  pl,
  products,
  setPromo,
  desktop,
}: {
  pl: ReturnType<typeof computePromoLines>[number];
  products: ErpProduct[];
  setPromo: React.Dispatch<React.SetStateAction<PromoState>>;
  desktop?: boolean;
}) {
  const fp = products.find((x) => x.id === pl.selected_product_id);
  const content = (
    <>
      {pl.free_options.length > 1 ? (
        <select
          value={pl.selected_product_id}
          onChange={(e) =>
            setPromo((s) => {
              const overrides = { ...s.overrides };
              delete overrides[pl.key];
              return { ...s, overrides, selected: { ...s.selected, [pl.key]: Number(e.target.value) } };
            })
          }
          className="rounded-lg border border-leaf-400 bg-white px-2 py-1 text-sm font-semibold"
        >
          {pl.free_options.map((o) => <option key={o.product_id} value={o.product_id}>{o.name} ({o.qty})</option>)}
        </select>
      ) : (
        <span className="font-semibold">{fp?.name ?? `Product #${pl.selected_product_id}`}</span>
      )}
      <span className="ml-2 rounded-full bg-lime-200 px-2 py-0.5 text-[10px] font-bold text-forest-900">{pl.orderWide ? "FREE (order value)" : "FREE (promo)"}</span>
      {fp && pl.qty > fp.stock && <p className="text-[11px] text-red-600">Only {fp.stock} in stock</p>}
    </>
  );
  const qty = (
    <input
      type="number"
      min={0}
      value={pl.qty}
      onChange={(e) => setPromo((s) => ({ ...s, overrides: { ...s.overrides, [pl.key]: Math.max(0, parseInt(e.target.value) || 0) } }))}
      className={cell}
    />
  );
  const remove = (
    <button onClick={() => setPromo((s) => ({ ...s, declined: new Set([...s.declined, `${pl.key}:${pl.multiples}`]) }))} className="text-red-500 hover:text-red-700" aria-label="Remove free item">
      <Trash2 className="size-4" />
    </button>
  );
  if (desktop)
    return (
      <tr className="bg-lime-100/60">
        <td className="px-4 py-2" colSpan={7}>{content}</td>
        <td className="px-1 py-2 text-center">{qty}</td>
        <td className="px-2 py-2 text-right text-ink-400">0.0000</td>
        <td className="px-4 py-2 text-right"><span className="mr-2 font-bold">0</span>{remove}</td>
      </tr>
    );
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-lime-100/70 p-4">
      <div className="min-w-0">{content}</div>
      <div className="flex items-center gap-2">{qty}{remove}</div>
    </div>
  );
}

function DamageModal({
  products,
  suppliers,
  entries,
  onClose,
  onSave,
  onDelete,
}: {
  products: ErpProduct[];
  suppliers: string[];
  entries: DamageEntry[];
  onClose: () => void;
  onSave: (e: DamageEntry) => void;
  onDelete: (i: number) => void;
}) {
  const [q, setQ] = useState("");
  const [sup, setSup] = useState("");
  const [rows, setRows] = useState<Record<number, { carton: number; piece: number; price: string; returned: boolean }>>({});
  const [err, setErr] = useState<string | null>(null);
  const list = products.filter((p) => (!sup || p.sup === sup) && (!q || p.name.toLowerCase().includes(q.toLowerCase())));
  const row = (id: number) => rows[id] ?? { carton: 0, piece: 0, price: "", returned: true };
  const set = (id: number, patch: Partial<ReturnType<typeof row>>) => setRows((r) => ({ ...r, [id]: { ...row(id), ...patch } }));
  const computed = products
    .filter((p) => rows[p.id])
    .map((p) => ({ p, ...damageLine(p, row(p.id).carton, row(p.id).piece, num(row(p.id).price) || null, row(p.id).returned) }))
    .filter((x) => x.qty > 0);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-forest-950/40 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-[28px] bg-white shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-6 pb-3">
          <div>
            <h2 className="text-xl font-extrabold text-forest-900">Record extra damage</h2>
            <p className="text-sm text-ink-600">Priced at FIFO cost unless you type a price. Untick “stock returned” when the DSR pays cash and keeps the goods.</p>
          </div>
          <button onClick={onClose} aria-label="Close"><X className="size-5" /></button>
        </div>
        <div className="flex gap-3 px-6">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className={field} />
          <select value={sup} onChange={(e) => setSup(e.target.value)} className={fieldBase}>
            <option value="">All suppliers</option>
            {suppliers.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        {err && <p className="mx-6 mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{err}</p>}
        <div className="mt-3 flex-1 overflow-auto px-6">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white text-left text-[11px] font-bold uppercase tracking-wider text-ink-600">
              <tr><th className="py-2">Item</th><th className="text-center">Carton</th><th className="text-center">Pcs</th><th className="text-center">Qty</th><th className="text-right">Price</th><th className="text-right">Sub total</th><th className="text-center">Stock returned?</th></tr>
            </thead>
            <tbody className="divide-y divide-ink-900/5">
              {list.map((p) => {
                const r = row(p.id);
                const c = damageLine(p, r.carton, r.piece, num(r.price) || null, r.returned);
                return (
                  <tr key={p.id} className={cn(!r.returned && "bg-amber-50")}>
                    <td className="py-2 pr-2"><p className="font-semibold">{p.name}</p><p className="text-[11px] text-ink-400">Stock {p.stock} · 1 carton = {p.per || 12} pcs</p></td>
                    <td className="text-center"><input type="number" min={0} value={r.carton || ""} placeholder="0" onChange={(e) => set(p.id, { carton: int(e.target.value) })} className={cell} /></td>
                    <td className="text-center"><input type="number" min={0} value={r.piece || ""} placeholder="0" onChange={(e) => set(p.id, { piece: int(e.target.value) })} className={cell} /></td>
                    <td className={cn("text-center tabular-nums", c.overStock && "font-bold text-red-600")}>{c.qty}</td>
                    <td className="text-right"><input type="number" min={0} step={0.0001} value={r.price} placeholder={c.qty ? String(c.price) : "0"} onChange={(e) => set(p.id, { price: e.target.value })} className={cn(cell, "w-24 text-right")} /></td>
                    <td className="text-right font-bold tabular-nums">{fmt(c.subtotal)}</td>
                    <td className="text-center"><input type="checkbox" checked={r.returned} onChange={(e) => set(p.id, { returned: e.target.checked })} className="size-4 accent-forest-700" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {entries.length > 0 && (
            <div className="mt-5 rounded-2xl bg-mint-50 p-4">
              <p className="mb-2 text-sm font-extrabold">Saved on this order</p>
              {entries.map((e, i) => (
                <div key={i} className="flex items-center justify-between py-1 text-sm">
                  <span>{e.noteNo}: {e.lines.map((l) => `${l.name} × ${l.qty}${l.noStock ? " (cash only)" : ""}`).join(", ")}</span>
                  <span className="flex items-center gap-3 font-bold">{fmt(e.lines.reduce((s, l) => s + l.subtotal, 0))}<button onClick={() => onDelete(i)} aria-label="Delete"><Trash2 className="size-4 text-red-500" /></button></span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-ink-900/5 p-6 pt-4">
          <span className="text-sm text-ink-600">Total <b className="text-ink-900">{computed.reduce((s, x) => s + x.qty, 0)}</b> pcs · <b className="text-ink-900">{fmt(computed.reduce((s, x) => s + x.subtotal, 0))}</b></span>
          <button
            onClick={() => {
              if (!computed.length) return setErr("Add at least one line with quantity.");
              const bad = computed.find((x) => x.overStock);
              if (bad) return setErr(`"${bad.p.name}": only ${bad.p.stock} in stock.`);
              onSave({ noteNo: `DMG-preview-${entries.length + 1}`, lines: computed.map((x) => ({ name: x.p.name, qty: x.qty, price: x.price, subtotal: x.subtotal, noStock: x.noStock })) });
            }}
            className="btn-forest rounded-full px-6 py-2.5 text-sm font-bold"
          >
            Save damage
          </button>
        </div>
      </div>
    </div>
  );
}
