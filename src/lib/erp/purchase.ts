import { round2 } from "./money";
import { award, type PromoLine, type PromoState } from "./sales";
import type { OrderWideOffer, Promo } from "./types";

export type PurchaseLineInput = { carton: number; piece: number; per: number; buyPrice: number; freeQty?: number };

/** PO and GRN rows: qty = carton × per + piece; subtotal = qty × buy price (free qty costs nothing). */
export function purchaseLine(l: PurchaseLineInput) {
  const qty = (l.carton || 0) * (l.per || 12) + (l.piece || 0);
  return { qty, freeQty: l.freeQty || 0, subtotal: qty * (l.buyPrice || 0) };
}

export const isCountedPurchaseLine = (l: { qty: number; freeQty: number }) => l.qty > 0 || l.freeQty > 0;

/**
 * Goods Receive totals. A supplier advance (money already paid ahead) is used up before any new due:
 * "Full" pays only what remains after the advance.
 */
export function grnTotals(subTotal: number, commission: number, transport: number, paidInput: number, fullPaid: boolean, advanceAvailable: number) {
  const payable = round2(subTotal - commission + transport);
  const paid = fullPaid ? round2(Math.max(0, payable - advanceAvailable)) : paidInput;
  const advanceApplied = Math.min(advanceAvailable, Math.max(0, payable - paid));
  const due = round2(payable - paid - advanceApplied);
  return { subTotal: round2(subTotal), payable, paid, advanceApplied, due };
}

/** PO vs GRN: pending = ordered − received (never below zero). */
export const poPending = (ordered: number, received: number) => Math.max(0, ordered - received);

/**
 * Promotional offers on a purchase (PO, or goods receive not against a PO): the same engine as sales —
 * per-product offers by qty or value, plus whole-order value offers, recomputed from scratch each time.
 */
export function purchasePromoLines(
  lines: { productId: number; qty: number; subtotal: number }[],
  byProduct: Map<number, Promo>,
  orderWide: OrderWideOffer[],
  state: PromoState,
): PromoLine[] {
  const out: PromoLine[] = [];
  for (const l of lines) {
    const promo = byProduct.get(l.productId);
    if (!promo?.free_options?.length) continue;
    const multiples =
      promo.basis === "value"
        ? promo.target_amount && l.subtotal >= promo.target_amount ? Math.floor(l.subtotal / promo.target_amount) : 0
        : promo.target_qty && l.qty >= promo.target_qty ? Math.floor(l.qty / promo.target_qty) : 0;
    const line = award(String(l.productId), promo.offer_id, promo.free_options, multiples, state, false);
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
