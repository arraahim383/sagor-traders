// Builds the erp_post payload (document + stock moves + journal) for every non-sales document.
// Pure functions: the server actions call these, and the tests check every journal balances.
import type { AccountKey, CashAccount } from "./accounting";
import { purchaseLine, grnTotals } from "./purchase";
import { round2 } from "./money";

export type PartyType = "retailer" | "sr" | "dsr" | "supplier" | "staff";
/** "$cost:<tag>" is replaced in the database by the FIFO cost of the stock just issued under that tag. */
export type JLine = { account: AccountKey; debit: number | string; credit: number | string; party_type?: PartyType | null; party_id?: number | null };
export type StockOp = { op: "in" | "out"; product_id: number; qty: number; rate?: number; sale?: number; tag?: string };
export type PostPayload = {
  date: string;
  narration?: string;
  doc: { table: string; prefix: string; number_column?: string; row: Record<string, unknown> };
  lines?: { table: string; fk: string; rows: Record<string, unknown>[] };
  stock?: StockOp[];
  journal?: JLine[];
};

const dr = (account: AccountKey, amount: number | string, party?: { type: PartyType; id: number }): JLine => ({
  account,
  debit: typeof amount === "number" ? round2(amount) : amount,
  credit: 0,
  party_type: party?.type ?? null,
  party_id: party?.id ?? null,
});
const cr = (account: AccountKey, amount: number | string, party?: { type: PartyType; id: number }): JLine => ({
  account,
  debit: 0,
  credit: typeof amount === "number" ? round2(amount) : amount,
  party_type: party?.type ?? null,
  party_id: party?.id ?? null,
});
const nonZero = (l: JLine[]) => l.filter((x) => typeof x.debit === "string" || typeof x.credit === "string" || Number(x.debit) > 0 || Number(x.credit) > 0);

export const PARTY_ACCOUNT: Record<PartyType, AccountKey> = {
  retailer: "arRetailers",
  sr: "srControl",
  dsr: "dsrControl",
  supplier: "apSuppliers",
  staff: "salaryPayable",
};

/** Only the numeric lines can be checked before posting; $cost lines balance by construction (same tag both sides). */
export function journalBalances(lines: JLine[]) {
  const num = (v: number | string) => (typeof v === "number" ? v : 0);
  const d = round2(lines.reduce((s, l) => s + num(l.debit), 0));
  const c = round2(lines.reduce((s, l) => s + num(l.credit), 0));
  const costTags = (side: "debit" | "credit") => lines.map((l) => l[side]).filter((v): v is string => typeof v === "string").sort().join(",");
  return d === c && costTags("debit") === costTags("credit");
}

// ── Purchase order ───────────────────────────────────────────────────────────
export type POLineIn = { product_id: number; carton: number; piece: number; per: number; buy_price: number; is_free?: boolean };
export function purchaseOrderPayload(i: { date: string; supplier_id: number; remark?: string; lines: POLineIn[] }): PostPayload {
  const rows = i.lines
    .map((l) => {
      const c = purchaseLine({ carton: l.carton, piece: l.piece, per: l.per, buyPrice: l.is_free ? 0 : l.buy_price });
      return { product_id: l.product_id, carton: l.carton, piece: l.piece, qty: c.qty, buy_price: l.is_free ? 0 : l.buy_price, subtotal: round2(c.subtotal), is_free: !!l.is_free };
    })
    .filter((r) => r.qty > 0);
  return {
    date: i.date,
    doc: { table: "erp_purchase_orders", prefix: "PO", number_column: "po_no", row: { date: i.date, supplier_id: i.supplier_id, remark: i.remark || null, subtotal: round2(rows.reduce((s, r) => s + r.subtotal, 0)) } },
    lines: { table: "erp_purchase_order_lines", fk: "po_id", rows },
  };
}

// ── Goods receive ────────────────────────────────────────────────────────────
export type GRNLineIn = { product_id: number; carton: number; piece: number; per: number; free_qty: number; buy_price: number; sale_price: number; is_free?: boolean };
/**
 * Stock in at the buy price (free pieces at zero cost), supplier credited with the payable.
 * Fix vs Rushda: commission and transport are posted to their own accounts instead of being folded into
 * Inventory, so the Inventory account always equals the value of the lots.
 */
export function goodsReceivePayload(i: {
  date: string;
  supplier_id: number;
  invoice_no?: string;
  po_id?: number | null;
  commission: number;
  transport: number;
  paid: number;
  fullPaid: boolean;
  advanceAvailable: number;
  account: CashAccount;
  mode: string;
  lines: GRNLineIn[];
}): PostPayload & { totals: ReturnType<typeof grnTotals> } {
  const rows = i.lines
    .map((l) => {
      // Promotional free lines (Rushda: piece qty, buy price 0, is_free) come in as zero-cost stock.
      const buy = l.is_free ? 0 : l.buy_price;
      const c = purchaseLine({ carton: l.carton, piece: l.piece, per: l.per, buyPrice: buy, freeQty: l.free_qty });
      return { product_id: l.product_id, carton: l.carton, piece: l.piece, qty: c.qty, free_qty: c.freeQty, buy_price: buy, sale_price: l.sale_price, subtotal: round2(c.subtotal), is_free: !!l.is_free };
    })
    .filter((r) => r.qty > 0 || r.free_qty > 0);
  const subTotal = rows.reduce((s, r) => s + r.subtotal, 0);
  const t = grnTotals(subTotal, i.commission, i.transport, i.paid, i.fullPaid, i.advanceAvailable);
  const sup = { type: "supplier" as const, id: i.supplier_id };
  return {
    totals: t,
    date: i.date,
    narration: `Goods received${i.invoice_no ? ` (invoice ${i.invoice_no})` : ""}`,
    doc: {
      table: "erp_goods_receipts",
      prefix: "GRN",
      number_column: "grn_no",
      row: {
        date: i.date,
        supplier_id: i.supplier_id,
        invoice_no: i.invoice_no || null,
        po_id: i.po_id ?? null,
        subtotal: t.subTotal,
        commission: round2(i.commission),
        transport: round2(i.transport),
        payable: t.payable,
        paid: t.paid,
        advance_applied: round2(t.advanceApplied),
        mode: i.mode,
      },
    },
    lines: { table: "erp_goods_receipt_lines", fk: "grn_id", rows },
    stock: rows.flatMap((r) => [
      { op: "in" as const, product_id: r.product_id, qty: r.qty, rate: r.buy_price, sale: r.sale_price },
      { op: "in" as const, product_id: r.product_id, qty: r.free_qty, rate: 0, sale: r.sale_price },
    ]).filter((s) => s.qty > 0),
    journal: nonZero([
      dr("inventory", t.subTotal),
      dr("transportExpense", i.transport),
      cr("apSuppliers", t.payable, sup),
      cr("discountReceived", i.commission),
      dr("apSuppliers", t.paid, sup),
      cr(i.account, t.paid),
    ]),
  };
}

// ── Payments ─────────────────────────────────────────────────────────────────
/** Money in from a retailer/SR/DSR (with "less" as a settlement discount) or out to a supplier/staff member. */
export function paymentPayload(i: {
  date: string;
  party_type: PartyType;
  party_id: number;
  amount: number;
  less: number;
  account: CashAccount;
  mode: string;
  ref_invoice?: string;
  remark?: string;
  partyName?: string;
}): PostPayload {
  const party = { type: i.party_type, id: i.party_id };
  const out = i.party_type === "supplier" || i.party_type === "staff";
  const ctl = PARTY_ACCOUNT[i.party_type];
  const journal = out
    ? [dr(ctl, i.amount + i.less, party), cr(i.account, i.amount), cr("discountReceived", i.less)]
    : [dr(i.account, i.amount), dr("discountAllowed", i.less), cr(ctl, i.amount + i.less, party)];
  return {
    date: i.date,
    narration: `${out ? "Payment to" : "Received from"} ${i.partyName ?? i.party_type}`,
    doc: {
      table: "erp_payments",
      prefix: "PAY",
      number_column: "voucher_no",
      row: { date: i.date, party_type: i.party_type, party_id: i.party_id, direction: out ? "out" : "in", amount: round2(i.amount), less: round2(i.less), mode: i.mode, ref_invoice: i.ref_invoice || null, remark: i.remark || null },
    },
    journal: nonZero(journal),
  };
}

// ── Claims on suppliers ──────────────────────────────────────────────────────
export function claimPayload(i: {
  date: string;
  supplier_id: number;
  type: "Damage" | "Rate Difference" | "General";
  amount: number;
  period_from?: string | null;
  period_to?: string | null;
  remark?: string;
  lines?: { product_id: number; qty: number; price: number }[];
}): PostPayload {
  const rows = (i.lines ?? []).filter((l) => l.qty > 0).map((l) => ({ ...l, subtotal: round2(l.qty * l.price) }));
  const amount = rows.length ? round2(rows.reduce((s, r) => s + r.subtotal, 0)) : round2(i.amount);
  const sup = { type: "supplier" as const, id: i.supplier_id };
  return {
    date: i.date,
    narration: `${i.type} claim`,
    doc: {
      table: "erp_claims",
      prefix: "CLM",
      number_column: "claim_no",
      row: { date: i.date, supplier_id: i.supplier_id, type: i.type, period_from: i.period_from || null, period_to: i.period_to || null, claimed: amount, remark: i.remark || null },
    },
    ...(rows.length ? { lines: { table: "erp_claim_lines", fk: "claim_id", rows } } : {}),
    journal: [dr("damageClaimReceivable", amount, sup), cr("otherIncome", amount)],
  };
}

/** Claim money received in cash/bank, or "Adjustment" = set off against what we owe the supplier. */
export function claimReceiptPayload(i: { date: string; claim_id: number; supplier_id: number; amount: number; account: CashAccount; mode: string; remark?: string }): PostPayload {
  const sup = { type: "supplier" as const, id: i.supplier_id };
  return {
    date: i.date,
    narration: "Claim received",
    doc: { table: "erp_claim_receipts", prefix: "CLR", number_column: "voucher_no", row: { date: i.date, claim_id: i.claim_id, amount: round2(i.amount), mode: i.mode, remark: i.remark || null } },
    journal: [i.mode === "Adjustment" ? dr("apSuppliers", i.amount, sup) : dr(i.account, i.amount), cr("damageClaimReceivable", i.amount, sup)],
  };
}

// ── Stock ────────────────────────────────────────────────────────────────────
/** Damage out of sellable stock at FIFO cost; "reduce"/"recover" brings it back at the given rate. */
export function damageNotePayload(i: { date: string; product_id: number; kind: "damage" | "reduce" | "recover"; qty: number; rate: number; sale: number; remark?: string }): PostPayload {
  const out = i.kind === "damage";
  return {
    date: i.date,
    narration: out ? "Damaged stock" : i.kind === "reduce" ? "Damage reduced (back to stock)" : "Damaged stock recovered",
    doc: { table: "erp_damage_notes", prefix: "DMG", number_column: "note_no", row: { date: i.date, product_id: i.product_id, kind: i.kind, qty: i.qty, rate: i.rate, amount: round2(i.qty * i.rate), remark: i.remark || null } },
    stock: [out ? { op: "out", product_id: i.product_id, qty: i.qty, tag: "dmg" } : { op: "in", product_id: i.product_id, qty: i.qty, rate: i.rate, sale: i.sale }],
    journal: out ? [dr("damageLoss", "$cost:dmg"), cr("inventory", "$cost:dmg")] : [dr("inventory", i.qty * i.rate), cr("damageLoss", i.qty * i.rate)],
  };
}

export function stockAdjustPayload(i: { date: string; product_id: number; direction: "in" | "out"; qty: number; rate: number; sale: number; reason?: string }): PostPayload {
  const inc = i.direction === "in";
  return {
    date: i.date,
    narration: `Stock ${inc ? "increase" : "decrease"}${i.reason ? `: ${i.reason}` : ""}`,
    doc: { table: "erp_stock_adjustments", prefix: "ADJ", number_column: "adj_no", row: { date: i.date, product_id: i.product_id, direction: i.direction, qty: i.qty, rate: i.rate, amount: round2(i.qty * i.rate), reason: i.reason || null } },
    stock: [inc ? { op: "in", product_id: i.product_id, qty: i.qty, rate: i.rate, sale: i.sale } : { op: "out", product_id: i.product_id, qty: i.qty, tag: "adj" }],
    journal: inc ? [dr("inventory", i.qty * i.rate), cr("inventoryAdjustment", i.qty * i.rate)] : [dr("inventoryAdjustment", "$cost:adj"), cr("inventory", "$cost:adj")],
  };
}

// ── Cash book ────────────────────────────────────────────────────────────────
export function cashEntryPayload(i: {
  date: string;
  kind: "receive" | "payment" | "transfer" | "adjustment";
  account: CashAccount;
  account_id: number;
  to_account?: CashAccount;
  to_account_id?: number;
  category_id?: number | null;
  category_kind?: "income" | "expense" | "transfer" | null;
  amount: number;
  direction?: "increase" | "decrease";
  description?: string;
  ref_no?: string;
}): PostPayload {
  const a = i.amount;
  let journal: JLine[];
  if (i.kind === "receive") journal = [dr(i.account, a), cr("otherIncome", a)];
  else if (i.kind === "payment") journal = [dr(i.category_kind === "income" ? "otherIncome" : "operatingExpenses", a), cr(i.account, a)];
  else if (i.kind === "transfer") journal = [dr(i.to_account!, a), cr(i.account, a)];
  else journal = i.direction === "decrease" ? [dr("cashBankAdjustment", a), cr(i.account, a)] : [dr(i.account, a), cr("cashBankAdjustment", a)];
  return {
    date: i.date,
    narration: i.description || i.kind,
    doc: {
      table: "erp_cash_entries",
      prefix: "CB",
      number_column: "voucher_no",
      row: { date: i.date, kind: i.kind, account_id: i.account_id, to_account_id: i.to_account_id ?? null, category_id: i.category_id ?? null, amount: round2(a), direction: i.direction ?? null, description: i.description || null, ref_no: i.ref_no || null },
    },
    journal,
  };
}

// ── Staff & bad debts ────────────────────────────────────────────────────────
export function salaryDeclarationPayload(i: { date: string; staff_id: number; month: string; amount: number; breakdown?: unknown; staffName?: string }): PostPayload {
  return {
    date: i.date,
    narration: `Salary ${i.month.slice(0, 7)}${i.staffName ? ` — ${i.staffName}` : ""}`,
    doc: { table: "erp_salary_declarations", prefix: "SAL", number_column: "voucher_no", row: { staff_id: i.staff_id, month: i.month, amount: round2(i.amount), breakdown: i.breakdown ?? null } },
    journal: [dr("salaryExpense", i.amount), cr("salaryPayable", i.amount, { type: "staff", id: i.staff_id })],
  };
}

export function badDebtPayload(i: { date: string; kind: "estimate" | "writeoff"; amount: number; party_type?: "retailer" | "sr" | "dsr"; party_id?: number; note?: string }): PostPayload {
  const a = i.amount;
  const journal =
    i.kind === "estimate"
      ? a >= 0
        ? [dr("badDebtExpense", a), cr("allowanceDoubtful", a)]
        : [dr("allowanceDoubtful", -a), cr("badDebtExpense", -a)]
      : [dr("allowanceDoubtful", a), cr(PARTY_ACCOUNT[i.party_type!], a, { type: i.party_type!, id: i.party_id! })];
  return {
    date: i.date,
    narration: i.kind === "estimate" ? "Allowance for bad debts" : "Bad debt written off",
    doc: { table: "erp_bad_debts", prefix: "BD", number_column: "voucher_no", row: { date: i.date, kind: i.kind, party_type: i.party_type ?? null, party_id: i.party_id ?? null, amount: round2(a), note: i.note || null } },
    journal,
  };
}

export function journalVoucherPayload(i: { date: string; narration: string; lines: { account: AccountKey; debit: number; credit: number }[] }): PostPayload {
  return {
    date: i.date,
    narration: i.narration,
    doc: { table: "erp_journals_manual", prefix: "JV", row: {} },
    journal: i.lines.filter((l) => l.debit > 0 || l.credit > 0).map((l) => ({ account: l.account, debit: round2(l.debit), credit: round2(l.credit) })),
  };
}

// ── Opening entries (new records added after cut-over) ──────────────────────
/**
 * A party's opening balance, booked against Owner's Capital. Positive = the normal side for that party:
 * retailer/SR/DSR owe us (debit), we owe a supplier or a staff member's salary (credit). Negative flips it.
 */
export function openingBalancePayload(i: { date: string; party_type: PartyType; party_id: number; amount: number; name?: string }): PostPayload {
  const party = { type: i.party_type, id: i.party_id };
  const owesUs = i.party_type === "retailer" || i.party_type === "sr" || i.party_type === "dsr";
  const debitParty = owesUs === i.amount > 0;
  const amt = Math.abs(i.amount);
  return {
    date: i.date,
    narration: `Opening balance${i.name ? `: ${i.name}` : ""}`,
    doc: { table: "erp_journals_manual", prefix: "OPEN", row: {} },
    journal: debitParty ? [dr(PARTY_ACCOUNT[i.party_type], amt, party), cr("ownersCapital", amt)] : [dr("ownersCapital", amt), cr(PARTY_ACCOUNT[i.party_type], amt, party)],
  };
}

/** Opening stock for a newly added product: a FIFO lot at the buy price, Dr Inventory / Cr Owner's Capital. */
export function openingStockPayload(i: { date: string; product_id: number; qty: number; rate: number; sale: number }): PostPayload {
  return {
    date: i.date,
    narration: "Opening stock",
    doc: { table: "erp_stock_adjustments", prefix: "ADJ", number_column: "adj_no", row: { date: i.date, product_id: i.product_id, direction: "in", qty: i.qty, rate: i.rate, amount: round2(i.qty * i.rate), reason: "Opening stock" } },
    stock: [{ op: "in", product_id: i.product_id, qty: i.qty, rate: i.rate, sale: i.sale }],
    journal: [dr("inventory", i.qty * i.rate), cr("ownersCapital", i.qty * i.rate)],
  };
}
