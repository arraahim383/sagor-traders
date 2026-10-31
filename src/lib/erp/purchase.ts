import { round2 } from "./money";

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
