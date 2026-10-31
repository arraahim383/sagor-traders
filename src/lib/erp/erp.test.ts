// Every expected number here comes from Sagor Traders' real Rushda data (captured 2026-10-31).
import { describe, expect, it } from "vitest";
import products from "./fixtures/rushda-products-2026-10-31.json";
import { fifoCalc, issueFromLots, stockFromLots } from "./fifo";
import { computeLine, computePromoLines, damageLine, isCountedLine, mainPaidAmount, orderTotals, overStock, priceWarning, retailerDue, splitRemaining, type PromoState } from "./sales";
import { grnTotals, purchaseLine } from "./purchase";
import { rateDifference, supplierRateBalance, damageClaimLine, claimStatus } from "./claims";
import { isBalanced, postClaimRaised, postGoodsReceive, postOpeningStock, postPartyReceipt, postSale, supplierBalance } from "./accounting";
import { allowanceEstimate, dsrPayroll, incentive, margin, targetProgress, DEFAULT_PAYROLL_POLICY } from "./people";
import type { ErpProduct } from "./types";

const catalog = products as ErpProduct[];
const byName = (name: string) => catalog.find((p) => p.name === name)!;
const none = { commission: 0, cashClaim: 0, cashDamage: 0, transport: 0, dsrCost: 0, discount: 0 };
const blank = { carton: 0, piece: 0, ret: 0, dmg: 0, freeQty: 0 };

describe("FIFO (Rushda fifoCalc)", () => {
  const p = { price: 100, lots: [{ qty: 10, rate: 100, sale: 100 }, { qty: 5, rate: 105, sale: 105 }] };
  it("consumes oldest lots first — Rushda's own example: 11 pcs = 1105", () => {
    expect(fifoCalc(p, 11)).toEqual({ amount: 1105, rate: 100.4545 });
  });
  it("prices any shortfall at the newest lot", () => {
    expect(fifoCalc(p, 20).amount).toBe(10 * 100 + 5 * 105 + 5 * 105);
  });
  it("zero qty returns the first lot's rate", () => {
    expect(fifoCalc(p, 0)).toEqual({ amount: 0, rate: 100 });
  });
  it("issuing removes stock oldest first, and stock = sum of lots", () => {
    const left = issueFromLots(p.lots, 12);
    expect(left).toEqual([{ qty: 3, rate: 105, sale: 105 }]);
    expect(stockFromLots(left)).toBe(3);
  });
});

describe("Sales order lines", () => {
  it("INV-2026-00424: 5 cartons Vatika 2.75ml at 8.1250 = 6,500; COGS 6,840", () => {
    const l = computeLine(byName("Vatika BlackShine Shampoo 2.75ml BD"), { ...blank, carton: 5, price: 8.125, manual: true });
    expect(l.billedQty).toBe(800);
    expect(l.subtotal).toBe(6500);
    expect(l.cost).toBe(6840);
  });

  it("INV-2026-01066: HIT CHALK 12 @18.50 + PHD 36 @10 = 582; COGS 2,967.60 (and we flag the unit mistake)", () => {
    const chalk = computeLine(byName("HIT CHALK"), { ...blank, piece: 12, price: 18.5, manual: true });
    const phd = computeLine(byName("PHD 3grm"), { ...blank, piece: 36, price: 10, manual: true });
    expect(chalk.subtotal + phd.subtotal).toBe(582);
    expect(chalk.cost + phd.cost).toBeCloseTo(2967.6, 2);
    expect(priceWarning(chalk)).toMatch(/check the unit/);
    expect(priceWarning(phd)).toBe("Below cost (12.60)");
  });

  it("auto price follows FIFO sale rate; sold = billed − return − damage; order qty includes free", () => {
    const l = computeLine(byName("Active +"), { carton: 1, piece: 4, ret: 2, dmg: 1, freeQty: 3 });
    expect(l.billedQty).toBe(52);
    expect(l.soldQty).toBe(49);
    expect(l.orderQty).toBe(55);
    expect(l.price).toBe(158);
    expect(l.subtotal).toBe(49 * 158);
    expect(priceWarning(l)).toBeNull();
  });

  it("drops empty rows, keeps free-only rows (Rushda does), and checks stock on sold + free", () => {
    const p = byName("HIT FIK 800 ML");
    expect(isCountedLine(computeLine(p, blank))).toBe(false);
    expect(isCountedLine(computeLine(p, { ...blank, freeQty: 1 }))).toBe(true);
    expect(isCountedLine(computeLine(p, { ...blank, piece: 1, freeQty: 1 }))).toBe(true);
    expect(overStock(computeLine(p, { ...blank, piece: 9, freeQty: 1 }))).toBe(true);
    expect(overStock(computeLine(p, { ...blank, piece: 8, freeQty: 1 }))).toBe(false);
  });
});

describe("Order totals (Rushda recalc)", () => {
  it("October Sales Summary: 376,259 total − 3,603 cash damage = 372,656 payable (why the dashboard's Total ≠ Due)", () => {
    const fake = [{ subtotal: 376259 }] as never;
    const t = orderTotals(fake, { ...none, cashDamage: 3603 }, 0, false);
    expect(t.payable).toBe(372656);
    expect(t.due).toBe(372656);
    expect(t.kind).toBe("due");
  });
  it("Paid Full sets paid = payable; overpaying turns Due into Receive", () => {
    const fake = [{ subtotal: 1000 }] as never;
    expect(orderTotals(fake, { ...none, commission: 50 }, 0, true)).toMatchObject({ payable: 950, paid: 950, due: 0, kind: "settled" });
    expect(orderTotals(fake, none, 1200, false)).toMatchObject({ due: -200, kind: "receive" });
  });
  it("split receive must equal the main paid amount within 0.01", () => {
    const main = mainPaidAmount(1500, 200);
    expect(main).toBe(1300);
    expect(splitRemaining(main, [{ amount: 1000 }, { amount: 299.995 }]).ok).toBe(true);
    expect(splitRemaining(main, [{ amount: 1000 }, { amount: 250 }])).toEqual({ remaining: 50, ok: false });
  });
});

describe("Promotional offers", () => {
  const promoProduct: ErpProduct = {
    ...byName("Active +"),
    promo: { offer_id: 7, basis: "qty", target_qty: 12, free_options: [{ product_id: 8, name: "GK Bullet", qty: 1 }, { product_id: 9, name: "GK Refill", qty: 2 }] },
  };
  const state = (): PromoState => ({ selected: {}, overrides: {}, declined: new Set<string>() });

  it("buy 12 get 1: 25 pcs = 2 multiples → 2 free; picking another option uses its qty", () => {
    const line = computeLine(promoProduct, { ...blank, piece: 25 });
    expect(computePromoLines([line], [], state())[0]).toMatchObject({ multiples: 2, qty: 2, selected_product_id: 8 });
    const s2 = state();
    s2.selected[String(promoProduct.id)] = 9;
    expect(computePromoLines([line], [], s2)[0].qty).toBe(4);
  });
  it("a removed free line stays removed at the same multiple, returns at a higher one", () => {
    const s = state();
    s.declined.add(`${promoProduct.id}:2`);
    expect(computePromoLines([computeLine(promoProduct, { ...blank, piece: 25 })], [], s)).toEqual([]);
    expect(computePromoLines([computeLine(promoProduct, { ...blank, piece: 36 })], [], s)[0].multiples).toBe(3);
  });
  it("order-wide offers judge the whole order total", () => {
    const line = computeLine(byName("HIT FIK 800 ML"), { ...blank, piece: 5 });
    const lines = computePromoLines([line], [{ offer_id: 3, target_amount: 1000, free_options: [{ product_id: 1, name: "HIT FIK 200 ML", qty: 1 }] }], state());
    expect(lines[0]).toMatchObject({ key: "ow3", multiples: 2, qty: 2, orderWide: true });
  });
});

describe("Damage and due retailer", () => {
  it("extra damage is priced at FIFO cost unless typed; cash-only ignores stock", () => {
    const p = byName("HIT FIK 800 ML");
    expect(damageLine(p, 0, 2, null, true)).toMatchObject({ qty: 2, price: 525.7, subtotal: 1051.4, overStock: false });
    expect(damageLine(p, 0, 20, 500, false)).toMatchObject({ subtotal: 10000, overStock: false, noStock: true });
    expect(damageLine(p, 0, 20, null, true).overStock).toBe(true);
  });
  it("due retailer: due = max(0, total − paid)", () => {
    const r = retailerDue([{ product: byName("Active +"), carton: 0, piece: 10 }], 500);
    expect(r.total).toBe(1580);
    expect(r.due).toBe(1080);
  });
});

describe("Purchases", () => {
  it("GRN-2026-00008 Godrej: payable 97,233.60, nothing paid → all due", () => {
    expect(grnTotals(97233.6, 0, 0, 0, false, 0)).toMatchObject({ payable: 97233.6, due: 97233.6 });
  });
  it("supplier advance is used before creating a due; Full pays only what's left", () => {
    expect(grnTotals(10000, 200, 100, 0, false, 3000)).toMatchObject({ payable: 9900, advanceApplied: 3000, due: 6900 });
    expect(grnTotals(10000, 0, 0, 0, true, 3000)).toMatchObject({ paid: 7000, advanceApplied: 3000, due: 0 });
  });
  it("Active + 1 carton (48) at 150.30 = 7,214.40 (GRN products report shows 7,214)", () => {
    expect(purchaseLine({ carton: 1, piece: 0, per: 48, buyPrice: 150.3 }).subtotal).toBeCloseTo(7214.4, 2);
  });
});

describe("Claims and over/under rate", () => {
  it("INV-2026-00424: Under 682.00", () => {
    expect(rateDifference(8.125, 8.9775, 800)).toEqual({ over: 0, under: 682 });
  });
  it("October Godrej: Over 790.20 − Under 52,959.10 = −52,168.90 claimable", () => {
    expect(supplierRateBalance([{ over: 790.2, under: 52959.1 }]).balance).toBe(-52168.9);
  });
  it("damage claim capped at damaged − already claimed; claim settles when fully received", () => {
    expect(damageClaimLine(10, 4, 9, 50)).toEqual({ available: 6, qty: 6, subtotal: 300, capped: true });
    expect(claimStatus(6831, 6831).status).toBe("Settled");
    expect(claimStatus(6831, 1000)).toEqual({ due: 5831, status: "Outstanding" });
  });
});

describe("Accounting postings balance", () => {
  it("sale with cash damage, as in Rushda's journal: SR 476 + Damage Loss 64 / Sales 540; COGS 560.40", () => {
    const lines = postSale({ party: "sr", total: 540, payable: 476, cost: 560.4, deductions: { ...none, cashDamage: 64 }, payments: [] });
    expect(isBalanced(lines)).toMatchObject({ debit: 1100.4, credit: 1100.4, balanced: true });
  });
  it("SR payment: Cash 178,083 + Discount 0.04 / SR Control 178,083.04", () => {
    const lines = postPartyReceipt({ party: "sr", amount: 178083, less: 0.04, account: "cash" });
    expect(lines).toEqual([
      { account: "cash", debit: 178083, credit: 0 },
      { account: "discountAllowed", debit: 0.04, credit: 0 },
      { account: "srControl", debit: 0, credit: 178083.04 },
    ]);
  });
  it("GRN, claims and opening stock all balance", () => {
    expect(isBalanced(postGoodsReceive({ payable: 97233.6, paid: 0, account: "cash", advanceApplied: 0 })).balanced).toBe(true);
    expect(isBalanced(postClaimRaised(6831)).balanced).toBe(true);
    expect(postOpeningStock(264183.47)).toEqual([
      { account: "inventory", debit: 264183.47, credit: 0 },
      { account: "ownersCapital", debit: 0, credit: 264183.47 },
    ]);
  });
  it("fix: one supplier balance — AP 112,627.72 less open claims 30,034 = 82,593.72 (Rushda's report shows 82,594)", () => {
    expect(supplierBalance(112627.72, 30034).net).toBe(82593.72);
  });
});

describe("People, targets, products", () => {
  it("DSR incentive on 900,000 sales: slab = 7,000, flat = 27,000", () => {
    expect(incentive(900000, DEFAULT_PAYROLL_POLICY.tiers, "slab").total).toBe(7000);
    expect(incentive(900000, DEFAULT_PAYROLL_POLICY.tiers, "flat").total).toBe(27000);
    expect(incentive(500000, DEFAULT_PAYROLL_POLICY.tiers).total).toBe(0);
  });
  it("DSR payroll: 26 days × 100 + basic 10,000 + incentive", () => {
    expect(dsrPayroll({ sales: 900000, workingDays: 26, dailyAllowance: 100, basicSalary: 10000, tiers: DEFAULT_PAYROLL_POLICY.tiers })).toMatchObject({
      allowance: 2600,
      incentive: 7000,
      totalEarnings: 9600,
      grandTotal: 19600,
    });
  });
  it("target progress and need per day", () => {
    expect(targetProgress(250000, 205388, 1)).toEqual({ percent: 82.16, remaining: 44612, needPerDay: 44612 });
    expect(targetProgress(0, 205388, 1).percent).toBeNull();
  });
  it("bad-debt allowance: 2% of 39,687.40 receivables = 793.75", () => {
    expect(allowanceEstimate(39687.4, "percent", 2, 0)).toEqual({ target: 793.75, adjustment: 793.75 });
  });
  it("product margin as Rushda shows it: 355.20 → 372 = 4.73%", () => {
    expect(margin(355.2, 372)).toBe(4.73);
  });
});
