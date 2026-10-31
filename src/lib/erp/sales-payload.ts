import type { CashAccount } from "./accounting";
import type { Deductions, LineInput } from "./sales";
import type { OrderType } from "./types";

/** What the sales screen sends to the server. Only raw inputs: every amount is recomputed server-side. */
export type SalesOrderInput = {
  /** Set when saving changes to (or finalizing) an existing draft. */
  orderId?: number | null;
  status: "draft" | "finalized";
  date: string;
  type: OrderType;
  srId: number | null;
  dsrId: number | null;
  retailerId: number | null;
  lines: (LineInput & { productId: number })[];
  freeLines: { productId: number; qty: number }[];
  deductions: Deductions;
  paidInput: number;
  fullPaid: boolean;
  paymentMode: string;
  depositAccount: CashAccount | null;
  split: { account: CashAccount; amount: number }[] | null;
  remark: string;
};

export type SaveResult = { ok: true; invoiceNo: string; orderId: number; status: "draft" | "finalized" } | { ok: false; error: string };

export const MODE_ACCOUNT: Record<string, CashAccount> = { Cash: "cash", Bkash: "bkash", Nagad: "nagad", Bank: "bank" };
