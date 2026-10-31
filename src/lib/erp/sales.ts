import { fifoCalc } from "./fifo";
import { isZero, round2 } from "./money";
import type { ErpProduct, OrderWideOffer, FreeOption } from "./types";

/** What the user typed on one product row of a sales order. */
export type LineInput = {
  carton: number;
  piece: number;
  ret: number;
  dmg: number;
  freeQty: number;
  /** Hand-typed price; only used when `manual` is true. */
  price?: number;
  manual?: boolean;
};

export type ComputedLine = {
  product: ErpProduct;
  carton: number;
  piece: number;
  ret: number;
  dmg: number;
  freeQty: number;
  /** carton × per + piece */
  billedQty: number;
  /** What the DSR physically carries out: billed + free. */
  orderQty: number;
  /** max(0, billed − return − damage) */
  soldQty: number;
  price: number;
  manual: boolean;
  subtotal: number;
  /** FIFO cost of the sold qty (for COGS and the below-cost warning). */
  cost: number;
};

const perOf = (p: ErpProduct) => p.per || 12;

/** One row, exactly as Rushda's updateRow()/getAllOrderLines() work it out. */
export function computeLine(p: ErpProduct, input: LineInput): ComputedLine {
  const per = perOf(p);
  const carton = input.carton || 0;
  const piece = input.piece || 0;
  const ret = input.ret || 0;
  const dmg = input.dmg || 0;
  const freeQty = input.freeQty || 0;
  const billedQty = carton * per + piece;
  const soldQty = Math.max(0, billedQty - ret - dmg);
  const orderQty = billedQty + freeQty;
  const manual = !!input.manual;
  const fifo = fifoCalc(p, soldQty, "sale");
  const price = (manual ? input.price ?? 0 : fifo.rate) || p.price;
  const subtotal = manual ? round2(soldQty * price) : fifo.amount;
  const cost = fifoCalc(p, soldQty, "rate").amount;
  return { product: p, carton, piece, ret, dmg, freeQty, billedQty, orderQty, soldQty, price, manual, subtotal, cost };
}

/** Rushda drops a row that has nothing billed and nothing free, or where everything nets to zero. */
export function isCountedLine(l: ComputedLine) {
  if (l.carton + l.piece === 0 && l.freeQty <= 0) return false;
  return !(l.soldQty === 0 && l.ret === 0 && l.dmg === 0 && l.freeQty === 0);
}

/** "only N in stock" — checked on blur and again on submit, for sold + free together. */
export const overStock = (l: ComputedLine) => l.soldQty + l.freeQty > l.product.stock;

export type Deductions = {
  commission: number;
  cashClaim: number;
  cashDamage: number;
  transport: number;
  dsrCost: number;
  discount: number;
};

export type OrderTotals = {
  total: number;
  payable: number;
  paid: number;
  /** payable − paid. Positive = due against the party; negative = received over (credited to them). */
  due: number;
  kind: "due" | "receive" | "settled";
};

/** Rushda's recalc(): payable = total − every deduction; "Paid Full" sets paid = payable. */
export function orderTotals(lines: ComputedLine[], d: Deductions, paidInput: number, fullPaid: boolean): OrderTotals {
  const total = round2(lines.reduce((s, l) => s + l.subtotal, 0));
  const payable = round2(total - d.commission - d.cashClaim - d.cashDamage - d.transport - d.dsrCost - d.discount);
  const paid = fullPaid ? round2(payable) : paidInput;
  const due = round2(payable - paid);
  const kind = isZero(due) ? "settled" : due < -0.005 ? "receive" : "due";
  return { total, payable, paid, due, kind };
}

/** The part of Paid that the split-receive rows must add up to (retailer-due payments settle in Cash separately). */
export const mainPaidAmount = (paid: number, retailerDuePaid: number) => round2(paid - retailerDuePaid);

/** Split Receive must match the main paid amount to within 0.01. Returns the remaining difference. */
export function splitRemaining(mainPaid: number, rows: { amount: number }[]) {
  const remaining = round2(mainPaid - rows.reduce((s, r) => s + (r.amount || 0), 0));
  return { remaining, ok: Math.abs(remaining) <= 0.01 };
}

// ── Promotional offers ───────────────────────────────────────────────────────

export type PromoLine = {
  key: string;
  offer_id: number;
  free_options: FreeOption[];
  multiples: number;
  selected_product_id: number;
  formulaQty: number;
  qty: number;
  orderWide: boolean;
};

export type PromoState = {
  /** The free option the buyer picked last time, per trigger key. */
  selected: Record<string, number | undefined>;
  /** Hand-typed free qty per trigger key. */
  overrides: Record<string, number | undefined>;
  /** `${key}:${multiples}` the buyer removed. */
  declined: Set<string>;
};

function award(
  key: string,
  offer_id: number,
  free_options: FreeOption[],
  multiples: number,
  state: PromoState,
  orderWide: boolean,
): PromoLine | null {
  if (multiples <= 0 || !free_options.length) return null;
  if (state.declined.has(`${key}:${multiples}`)) return null;
  const prev = state.selected[key];
  const selectedId = prev != null && free_options.some((o) => o.product_id === prev) ? prev : free_options[0].product_id;
  const option = free_options.find((o) => o.product_id === selectedId);
  const formulaQty = multiples * (option ? option.qty : 0);
  if (formulaQty <= 0) return null;
  const qty = state.overrides[key] !== undefined ? state.overrides[key]! : formulaQty;
  return { key, offer_id, free_options, multiples, selected_product_id: selectedId, formulaQty, qty, orderWide };
}

/** Recomputed from scratch on every change, never accumulated — same as Rushda. */
export function computePromoLines(lines: ComputedLine[], orderWide: OrderWideOffer[], state: PromoState): PromoLine[] {
  const out: PromoLine[] = [];
  for (const l of lines) {
    const promo = l.product.promo;
    if (!promo || !promo.free_options?.length) continue;
    let multiples: number;
    if (promo.basis === "value") {
      if (!promo.target_amount || l.subtotal < promo.target_amount) continue;
      multiples = Math.floor(l.subtotal / promo.target_amount);
    } else {
      if (!promo.target_qty || l.soldQty < promo.target_qty) continue;
      multiples = Math.floor(l.soldQty / promo.target_qty);
    }
    const line = award(String(l.product.id), promo.offer_id, promo.free_options, multiples, state, false);
    if (line) out.push(line);
  }
  const orderTotal = lines.reduce((s, l) => s + l.subtotal, 0);
  for (const offer of orderWide) {
    if (!offer.target_amount || orderTotal < offer.target_amount) continue;
    const line = award(`ow${offer.offer_id}`, offer.offer_id, offer.free_options, Math.floor(orderTotal / offer.target_amount), state, true);
    if (line) out.push(line);
  }
  return out;
}

// ── Extra damage & due retailer (modals on the order) ────────────────────────

/** Extra Damage row: priced at FIFO cost unless a rate was typed; cash-only rows don't touch stock. */
export function damageLine(p: ErpProduct, carton: number, piece: number, typedPrice: number | null, stockReturned: boolean) {
  const qty = carton * perOf(p) + piece;
  const overStock = stockReturned && qty > p.stock;
  const fifo = qty > 0 ? fifoCalc(p, qty, "rate") : { amount: 0, rate: 0 };
  const price = typedPrice && typedPrice > 0 ? typedPrice : fifo.rate;
  return { qty, price, subtotal: qty > 0 ? round2(qty * price) : 0, overStock, noStock: !stockReturned };
}

/** Goods from a DSR order given to one retailer on credit; their due goes to that retailer's ledger. */
export function retailerDue(lines: { product: ErpProduct; carton: number; piece: number }[], paid: number) {
  const rows = lines
    .map(({ product, carton, piece }) => {
      const qty = carton * perOf(product) + piece;
      const fifo = fifoCalc(product, qty, "sale");
      return { product, carton, piece, qty, price: fifo.rate, subtotal: fifo.amount, overStock: qty > product.stock };
    })
    .filter((r) => r.qty > 0);
  const total = rows.reduce((s, r) => s + r.subtotal, 0);
  return { rows, total, due: Math.max(0, round2(total - paid)) };
}

// ── Fix: catch unit mistakes at entry ────────────────────────────────────────

/**
 * Rushda lets a line be sold far below cost with no warning — e.g. HIT CHALK costed at 209.50/pc but sold
 * at 18.50/pc (INV-2026-01066, a 2,386 "loss" on a 582 sale). We still allow it (under-rate selling is real
 * and claimed back from the supplier) but flag it, and flag prices that look like a per-carton/per-piece mix-up.
 */
export function priceWarning(l: ComputedLine): string | null {
  if (l.soldQty <= 0 || l.cost <= 0) return null;
  const costRate = l.cost / l.soldQty;
  if (l.price < costRate / 3 || l.price > costRate * 3) return `Price ${l.price} vs cost ${costRate.toFixed(2)} — check the unit (piece vs carton)`;
  if (l.price < costRate) return `Below cost (${costRate.toFixed(2)})`;
  return null;
}
