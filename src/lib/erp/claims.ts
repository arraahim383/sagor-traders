import { round2 } from "./money";

/**
 * Over Rate / Under Rate for one sold line: (sold price − list price) × sold qty.
 * Positive is Over, negative is Under (reported as a positive number).
 * e.g. 800 pcs at 8.1250 against 8.9775 → Under 682.00 (INV-2026-00424).
 */
export function rateDifference(soldPrice: number, listPrice: number, soldQty: number) {
  const diff = round2((soldPrice - listPrice) * soldQty);
  return { over: diff > 0 ? diff : 0, under: diff < 0 ? -diff : 0 };
}

/** Per supplier: balance = Over − Under. Negative means the supplier owes us the difference (claimable). */
export function supplierRateBalance(rows: { over: number; under: number }[]) {
  const over = round2(rows.reduce((s, r) => s + r.over, 0));
  const under = round2(rows.reduce((s, r) => s + r.under, 0));
  return { over, under, balance: round2(over - under) };
}

/** Damage claim row: can claim at most what's damaged and not yet claimed. */
export function damageClaimLine(totalDamaged: number, alreadyClaimed: number, claimQty: number, price: number) {
  const available = Math.max(0, totalDamaged - alreadyClaimed);
  const qty = Math.min(Math.max(0, claimQty), available);
  return { available, qty, subtotal: qty * price, capped: claimQty > available };
}

/** Claim register: receiving defaults to, and is capped at, what's still due on the claim. */
export function claimStatus(claimed: number, received: number) {
  const due = round2(claimed - received);
  return { due, status: due <= 0.005 ? "Settled" : "Outstanding" } as const;
}
