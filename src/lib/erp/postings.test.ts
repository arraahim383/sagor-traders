import { describe, expect, it } from "vitest";
import {
  badDebtPayload,
  cashEntryPayload,
  claimPayload,
  claimReceiptPayload,
  damageNotePayload,
  goodsReceivePayload,
  journalBalances,
  journalVoucherPayload,
  paymentPayload,
  purchaseOrderPayload,
  salaryDeclarationPayload,
  stockAdjustPayload,
} from "./postings";

const D = "2026-11-01";

describe("Goods receive", () => {
  it("GRN-2026-00008 Godrej: 97,233.60 on credit — Inventory = lots value, supplier credited", () => {
    const p = goodsReceivePayload({
      date: D,
      supplier_id: 1,
      commission: 0,
      transport: 0,
      paid: 0,
      fullPaid: false,
      advanceAvailable: 0,
      account: "cash",
      mode: "Cash",
      lines: [{ product_id: 7, carton: 1, piece: 0, per: 48, free_qty: 0, buy_price: 150.3, sale_price: 158 }],
    });
    expect(p.totals.payable).toBe(7214.4);
    expect(p.journal).toEqual([
      { account: "inventory", debit: 7214.4, credit: 0, party_type: null, party_id: null },
      { account: "apSuppliers", debit: 0, credit: 7214.4, party_type: "supplier", party_id: 1 },
    ]);
    expect(p.stock).toEqual([{ op: "in", product_id: 7, qty: 48, rate: 150.3, sale: 158 }]);
  });

  it("commission, transport, free pieces and part payment all balance; free stock comes in at zero cost", () => {
    const p = goodsReceivePayload({
      date: D,
      supplier_id: 2,
      commission: 200,
      transport: 150,
      paid: 5000,
      fullPaid: false,
      advanceAvailable: 0,
      account: "bank",
      mode: "Bank",
      lines: [{ product_id: 78, carton: 5, piece: 0, per: 160, free_qty: 10, buy_price: 8.55, sale_price: 8.9775 }],
    });
    expect(p.totals).toMatchObject({ subTotal: 6840, payable: 6790, due: 1790 });
    expect(journalBalances(p.journal!)).toBe(true);
    expect(p.stock).toContainEqual({ op: "in", product_id: 78, qty: 10, rate: 0, sale: 8.9775 });
    expect(p.journal).toContainEqual({ account: "inventory", debit: 6840, credit: 0, party_type: null, party_id: null });
  });
});

describe("Payments", () => {
  it("SR pays 178,083 with 0.04 less — matches Rushda's voucher", () => {
    const p = paymentPayload({ date: D, party_type: "sr", party_id: 2, amount: 178083, less: 0.04, account: "cash", mode: "Cash" });
    expect(p.journal).toEqual([
      { account: "cash", debit: 178083, credit: 0, party_type: null, party_id: null },
      { account: "discountAllowed", debit: 0.04, credit: 0, party_type: null, party_id: null },
      { account: "srControl", debit: 0, credit: 178083.04, party_type: "sr", party_id: 2 },
    ]);
  });
  it("paying a supplier with less credits Discount Received", () => {
    const p = paymentPayload({ date: D, party_type: "supplier", party_id: 1, amount: 97000, less: 233.6, account: "bank", mode: "Bank Transfer" });
    expect(journalBalances(p.journal!)).toBe(true);
    expect(p.journal![0]).toMatchObject({ account: "apSuppliers", debit: 97233.6, party_type: "supplier" });
  });
});

describe("Claims, stock, cash book, staff, vouchers", () => {
  it("damage claim from lines; receipt by cash or set off against payable", () => {
    const c = claimPayload({ date: D, supplier_id: 2, type: "Damage", amount: 0, lines: [{ product_id: 78, qty: 10, price: 8.55 }] });
    expect(c.doc.row.claimed).toBe(85.5);
    expect(journalBalances(c.journal!)).toBe(true);
    const r = claimReceiptPayload({ date: D, claim_id: 1, supplier_id: 2, amount: 85.5, account: "cash", mode: "Adjustment" });
    expect(r.journal![0]).toMatchObject({ account: "apSuppliers", debit: 85.5 });
    expect(journalBalances(r.journal!)).toBe(true);
  });
  it("damage and stock decrease are valued at the FIFO cost the database issues", () => {
    const d = damageNotePayload({ date: D, product_id: 3, kind: "damage", qty: 2, rate: 0, sale: 552 });
    expect(d.journal).toEqual([
      { account: "damageLoss", debit: "$cost:dmg", credit: 0, party_type: null, party_id: null },
      { account: "inventory", debit: 0, credit: "$cost:dmg", party_type: null, party_id: null },
    ]);
    expect(journalBalances(d.journal!)).toBe(true);
    expect(journalBalances(stockAdjustPayload({ date: D, product_id: 3, direction: "out", qty: 1, rate: 0, sale: 0 }).journal!)).toBe(true);
    expect(journalBalances(stockAdjustPayload({ date: D, product_id: 3, direction: "in", qty: 1, rate: 525.7, sale: 552 }).journal!)).toBe(true);
    expect(journalBalances(damageNotePayload({ date: D, product_id: 3, kind: "recover", qty: 1, rate: 525.7, sale: 552 }).journal!)).toBe(true);
  });
  it("cash book: expense, income, transfer, adjustment", () => {
    for (const kind of ["receive", "payment", "transfer", "adjustment"] as const) {
      const p = cashEntryPayload({ date: D, kind, account: "cash", account_id: 1, to_account: "bank", to_account_id: 2, amount: 500, category_kind: "expense", direction: "decrease" });
      expect(journalBalances(p.journal!)).toBe(true);
    }
  });
  it("salary, bad debts and manual vouchers balance", () => {
    expect(journalBalances(salaryDeclarationPayload({ date: D, staff_id: 1, month: "2026-11-01", amount: 19600 }).journal!)).toBe(true);
    expect(journalBalances(badDebtPayload({ date: D, kind: "estimate", amount: 793.75 }).journal!)).toBe(true);
    expect(journalBalances(badDebtPayload({ date: D, kind: "estimate", amount: -100 }).journal!)).toBe(true);
    expect(journalBalances(badDebtPayload({ date: D, kind: "writeoff", amount: 636, party_type: "retailer", party_id: 5 }).journal!)).toBe(true);
    expect(journalBalances(journalVoucherPayload({ date: D, narration: "x", lines: [{ account: "cash", debit: 10, credit: 0 }, { account: "ownersCapital", debit: 0, credit: 10 }] }).journal!)).toBe(true);
  });
  it("purchase orders carry no journal and skip empty lines", () => {
    const p = purchaseOrderPayload({ date: D, supplier_id: 1, lines: [{ product_id: 1, carton: 2, piece: 0, per: 60, buy_price: 170.5 }, { product_id: 2, carton: 0, piece: 0, per: 16, buy_price: 355.2 }] });
    expect(p.lines!.rows).toHaveLength(1);
    expect(p.doc.row.subtotal).toBe(20460);
    expect(p.journal).toBeUndefined();
  });
});
