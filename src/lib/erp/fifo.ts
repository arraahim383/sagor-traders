import { round2, round4 } from "./money";
import type { ErpProduct } from "./types";

export type FifoField = "rate" | "sale";

/**
 * FIFO amount for `qty` pieces: oldest lots first (10@100 then 5@105 → 11 pcs = 1105).
 * `field` picks cost (`rate`) or selling price (`sale`). Any shortfall beyond the lots is priced at the
 * newest lot. Same as Rushda's fifoCalc(), including falling back to the product price when a lot has none.
 */
export function fifoCalc(p: Pick<ErpProduct, "lots" | "price">, qty: number, field: FifoField = "rate") {
  const lots = p.lots ?? [];
  const first = lots.length && lots[0][field] ? lots[0][field] : p.price;
  if (qty <= 0) return { amount: 0, rate: first };
  const last = lots.length && lots[lots.length - 1][field] ? lots[lots.length - 1][field] : p.price;
  let rem = qty;
  let amt = 0;
  for (const l of lots) {
    if (rem <= 0) break;
    const take = Math.min(l.qty, rem);
    amt += take * (l[field] || p.price);
    rem -= take;
  }
  if (rem > 0) amt += rem * last;
  return { amount: round2(amt), rate: round4(amt / qty) };
}

/** Lots left after issuing `qty` pieces oldest first — what the server does when an order is finalized. */
export function issueFromLots<T extends { qty: number }>(lots: T[], qty: number): T[] {
  let rem = qty;
  const out: T[] = [];
  for (const l of lots) {
    if (rem <= 0) {
      out.push(l);
      continue;
    }
    const take = Math.min(l.qty, rem);
    rem -= take;
    if (l.qty - take > 0) out.push({ ...l, qty: l.qty - take });
  }
  return out;
}

/**
 * Fix: stock is always the sum of the remaining lots. In Rushda the two drift apart
 * (22 of 86 products on 2026-10-31, e.g. PHD 3grm stock 1,176 vs lots 1,644).
 */
export const stockFromLots = (lots: { qty: number }[]) => lots.reduce((s, l) => s + l.qty, 0);
