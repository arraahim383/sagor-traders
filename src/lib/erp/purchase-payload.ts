import type { CashAccount } from "./accounting";

export type PurchaseLineInput = { productId: number; carton: number; piece: number; free: number; buy: number; sale: number };

export type PurchaseInput = {
  mode: "po" | "grn";
  date: string;
  supplierId: number;
  invoiceNo?: string;
  poId?: number | null;
  remark?: string;
  lines: PurchaseLineInput[];
  commission: number;
  transport: number;
  paid: number;
  fullPaid: boolean;
  account: CashAccount;
  payMode: string;
};

export type PostResult = { ok: true; number: string; id: number } | { ok: false; error: string };
