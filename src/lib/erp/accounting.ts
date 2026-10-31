import { round2 } from "./money";

/** Rushda's chart of accounts, codes unchanged so reports line up with the old system. */
export const ACCOUNTS = {
  cash: { code: "1000", name: "Cash", type: "asset", cash: true },
  bank: { code: "1010", name: "Bank", type: "asset", cash: true },
  bkash: { code: "1020", name: "bKash-01777940795", type: "asset", cash: true },
  nagad: { code: "1030", name: "Nagad-01777940795", type: "asset", cash: true },
  inventory: { code: "1100", name: "Inventory", type: "asset" },
  arRetailers: { code: "1200", name: "Accounts Receivable — Retailers", type: "asset" },
  dsrControl: { code: "1210", name: "DSR Control", type: "asset" },
  srControl: { code: "1220", name: "SR Control", type: "asset" },
  damageClaimReceivable: { code: "1300", name: "Damage Claim Receivable", type: "asset" },
  fixedAssets: { code: "1350", name: "Fixed Assets (at cost)", type: "asset" },
  accumulatedDepreciation: { code: "1360", name: "Accumulated Depreciation", type: "asset" },
  allowanceDoubtful: { code: "1370", name: "Allowance for Doubtful Accounts", type: "asset" },
  apSuppliers: { code: "2000", name: "Accounts Payable — Suppliers", type: "liability" },
  salaryPayable: { code: "2100", name: "Salary Payable", type: "liability" },
  ownersCapital: { code: "3000", name: "Owner's Capital", type: "equity" },
  cashBankAdjustment: { code: "3100", name: "Cash/Bank Adjustment", type: "equity" },
  retainedEarnings: { code: "3900", name: "Retained Earnings", type: "equity" },
  salesRevenue: { code: "4000", name: "Sales Revenue", type: "income" },
  discountReceived: { code: "4100", name: "Discount Received", type: "income" },
  inventoryAdjustment: { code: "4200", name: "Inventory Adjustment", type: "income" },
  otherIncome: { code: "4900", name: "Other Income", type: "income" },
  cogs: { code: "5000", name: "Cost of Goods Sold", type: "expense" },
  commissionExpense: { code: "5100", name: "Commission Expense", type: "expense" },
  transportExpense: { code: "5200", name: "Transport Expense", type: "expense" },
  damageLoss: { code: "5300", name: "Damage Loss", type: "expense" },
  discountAllowed: { code: "5400", name: "Discount Allowed", type: "expense" },
  badDebtExpense: { code: "5500", name: "Bad Debt Expense", type: "expense" },
  salaryExpense: { code: "6000", name: "Salary Expense", type: "expense" },
  depreciationExpense: { code: "6100", name: "Depreciation Expense", type: "expense" },
  operatingExpenses: { code: "6200", name: "Operating Expenses", type: "expense" },
} as const;

export type AccountKey = keyof typeof ACCOUNTS;
export type CashAccount = "cash" | "bank" | "bkash" | "nagad";
export type JournalLine = { account: AccountKey; debit: number; credit: number };

const dr = (account: AccountKey, amount: number): JournalLine => ({ account, debit: round2(amount), credit: 0 });
const cr = (account: AccountKey, amount: number): JournalLine => ({ account, debit: 0, credit: round2(amount) });
const clean = (lines: JournalLine[]) => lines.filter((l) => l.debit > 0 || l.credit > 0);

export function isBalanced(lines: JournalLine[]) {
  const debit = round2(lines.reduce((s, l) => s + l.debit, 0));
  const credit = round2(lines.reduce((s, l) => s + l.credit, 0));
  return { debit, credit, balanced: debit === credit, difference: round2(Math.abs(debit - credit)) };
}

export type SaleParty = "sr" | "dsr" | "retailer";
const partyAccount = (p: SaleParty): AccountKey => (p === "sr" ? "srControl" : p === "dsr" ? "dsrControl" : "arRetailers");

/**
 * Posting for a finalized sale, as seen in Rushda's Journal Book:
 *   Dr party (payable) + Dr each deduction  /  Cr Sales Revenue (total)
 *   Dr COGS / Cr Inventory (FIFO cost)
 *   Dr cash accounts / Cr party (whatever was paid at sale)
 * Deduction accounts: cash damage → Damage Loss (seen in Rushda). Commission, transport, discount, cash claim
 * and DSR cost weren't used in October; mapped to their natural accounts (to confirm).
 */
export function postSale(o: {
  party: SaleParty;
  total: number;
  payable: number;
  cost: number;
  deductions: { commission: number; cashClaim: number; cashDamage: number; transport: number; dsrCost: number; discount: number };
  payments: { account: CashAccount; amount: number }[];
}) {
  const d = o.deductions;
  const party = partyAccount(o.party);
  return clean([
    dr(party, o.payable),
    dr("commissionExpense", d.commission),
    dr("damageClaimReceivable", d.cashClaim),
    dr("damageLoss", d.cashDamage),
    dr("transportExpense", d.transport + d.dsrCost),
    dr("discountAllowed", d.discount),
    cr("salesRevenue", o.total),
    dr("cogs", o.cost),
    cr("inventory", o.cost),
    ...o.payments.flatMap((p) => [dr(p.account, p.amount), cr(party, p.amount)]),
  ]);
}

/** Goods receive: Dr Inventory (payable) / Cr Accounts Payable; paid now: Dr AP / Cr cash. */
export function postGoodsReceive(o: { payable: number; paid: number; account: CashAccount; advanceApplied: number }) {
  return clean([dr("inventory", o.payable), cr("apSuppliers", o.payable), dr("apSuppliers", o.paid), cr(o.account, o.paid)]);
}

/** Money received from an SR/DSR/retailer: Dr cash (amount) + Dr Discount Allowed (less) / Cr party (amount + less). */
export function postPartyReceipt(o: { party: SaleParty; amount: number; less: number; account: CashAccount }) {
  return clean([dr(o.account, o.amount), dr("discountAllowed", o.less), cr(partyAccount(o.party), o.amount + o.less)]);
}

/** Paying a supplier: Dr AP (amount + less) / Cr cash (amount) + Cr Discount Received (less). */
export function postSupplierPayment(o: { amount: number; less: number; account: CashAccount }) {
  return clean([dr("apSuppliers", o.amount + o.less), cr(o.account, o.amount), cr("discountReceived", o.less)]);
}

/** Damage or rate-difference claim raised on a supplier: Dr Damage Claim Receivable / Cr Other Income. */
export const postClaimRaised = (amount: number) => clean([dr("damageClaimReceivable", amount), cr("otherIncome", amount)]);
export const postClaimReceived = (amount: number, account: CashAccount) => clean([dr(account, amount), cr("damageClaimReceivable", amount)]);

/**
 * Fix: opening stock must be put on the books. Rushda took quantities in as "Opening" without valuing them,
 * so every sale since has drawn cost out of an Inventory account that never had it — Inventory reads
 * −264,183.47 on 2026-10-31, which is impossible.
 */
export const postOpeningStock = (value: number) => clean([dr("inventory", value), cr("ownersCapital", value)]);

/** Opening balances for parties (retailer/SR/DSR owe us; supplier we owe) — also against Owner's Capital. */
export function postOpeningBalance(kind: SaleParty | "supplier", amount: number) {
  if (kind === "supplier") return clean([dr("ownersCapital", amount), cr("apSuppliers", amount)]);
  return clean([dr(partyAccount(kind), amount), cr("ownersCapital", amount)]);
}

/**
 * Fix: one supplier balance everywhere. Rushda's Supplier Balance report nets open claims (82,594) while
 * the Accounts Payable ledger doesn't (112,627.72) — a 30,033.72 gap that is exactly the open claims.
 */
export function supplierBalance(payable: number, claimsReceivable: number) {
  return { payable: round2(payable), claimsReceivable: round2(claimsReceivable), net: round2(payable - claimsReceivable) };
}
