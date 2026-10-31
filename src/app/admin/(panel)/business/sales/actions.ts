"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/admin/auth";
import { postSale, type AccountKey, type CashAccount } from "@/lib/erp/accounting";
import { loadProducts } from "@/lib/erp/data";
import { round2 } from "@/lib/erp/money";
import { computeLine, isCountedLine, mainPaidAmount, orderTotals, overStock, splitRemaining } from "@/lib/erp/sales";
import { MODE_ACCOUNT, type SalesOrderInput, type SaveResult } from "@/lib/erp/sales-payload";

const PARTY_ACCOUNT: Partial<Record<AccountKey, "sr" | "dsr" | "retailer">> = { srControl: "sr", dsrControl: "dsr", arRetailers: "retailer" };

/**
 * Saves a sales order. Prices, totals and the journal are recomputed here from the live lots with the same
 * engine the screen uses, so what's stored never depends on numbers sent from the browser.
 */
export async function saveSalesOrder(input: SalesOrderInput): Promise<SaveResult> {
  const { supabase } = await requireStaff();

  const ids = [...new Set([...input.lines.map((l) => l.productId), ...input.freeLines.map((f) => f.productId)])];
  if (!ids.length) return { ok: false, error: "Add at least one line with quantity." };
  const products = await loadProducts(supabase, ids);
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines = input.lines
    .map((l) => {
      const p = byId.get(l.productId);
      return p ? computeLine(p, l) : null;
    })
    .filter((l): l is NonNullable<typeof l> => !!l && isCountedLine(l));
  const free = input.freeLines.filter((f) => f.qty > 0 && byId.has(f.productId));
  if (!lines.length && !free.length) return { ok: false, error: "Add at least one line with quantity." };

  if (input.status === "finalized") {
    const errors = [
      ...lines.filter(overStock).map((l) => `"${l.product.name}": need ${l.soldQty + l.freeQty}, only ${l.product.stock} in stock`),
      ...free.filter((f) => f.qty > byId.get(f.productId)!.stock).map((f) => `"${byId.get(f.productId)!.name}" (free item): only ${byId.get(f.productId)!.stock} in stock`),
    ];
    if (errors.length) return { ok: false, error: "Insufficient stock: " + errors.join("; ") };
    if (input.type === "direct" ? !input.retailerId : !input.srId && !input.dsrId) {
      return { ok: false, error: input.type === "direct" ? "Select a retailer." : "Select an SR or DSR." };
    }
  }

  const d = input.deductions;
  const totals = orderTotals(lines, d, input.paidInput, input.fullPaid);
  const mainPaid = mainPaidAmount(totals.paid, 0);
  let payments: { account: CashAccount; amount: number }[];
  if (input.split) {
    const check = splitRemaining(mainPaid, input.split);
    if (!check.ok) return { ok: false, error: `Split payment amounts must add up to the main paid amount. Remaining: ${check.remaining}` };
    payments = input.split.filter((s) => s.amount > 0);
  } else {
    payments = totals.paid > 0 ? [{ account: input.depositAccount ?? MODE_ACCOUNT[input.paymentMode] ?? "cash", amount: totals.paid }] : [];
  }

  const party = input.type === "direct" ? ("retailer" as const) : input.srId ? ("sr" as const) : ("dsr" as const);
  const partyId = party === "retailer" ? input.retailerId : party === "sr" ? input.srId : input.dsrId;
  // COGS/Inventory are posted by the database from the lots it actually issues.
  const journal = postSale({ party, total: totals.total, payable: totals.payable, cost: 0, deductions: d, payments }).map((j) => ({
    account: j.account,
    debit: j.debit,
    credit: j.credit,
    party_type: PARTY_ACCOUNT[j.account] ?? null,
    party_id: PARTY_ACCOUNT[j.account] ? partyId : null,
  }));

  const partyName =
    party === "retailer"
      ? (await supabase.from("erp_retailers").select("name").eq("id", partyId).maybeSingle()).data?.name
      : (await supabase.from("erp_staff").select("name").eq("id", partyId).maybeSingle()).data?.name;

  const { data, error } = await supabase.rpc("erp_post_sale", {
    p: {
      order_id: input.orderId ?? null,
      status: input.status,
      date: input.date,
      type: input.type,
      sr_id: input.type === "direct" ? null : input.srId,
      dsr_id: input.type === "direct" ? null : input.dsrId,
      retailer_id: input.type === "direct" ? input.retailerId : null,
      total: totals.total,
      commission: round2(d.commission),
      cash_claim: round2(d.cashClaim),
      cash_damage: round2(d.cashDamage),
      transport: round2(d.transport),
      dsr_cost: round2(d.dsrCost),
      discount: round2(d.discount),
      payable: totals.payable,
      paid: totals.paid,
      payment_mode: input.split ? "Split" : input.paymentMode,
      remark: input.remark,
      narration: partyName ? `Sale to ${partyName}` : null,
      lines: [
        ...lines.map((l) => ({
          product_id: l.product.id,
          carton: l.carton,
          piece: l.piece,
          return_qty: l.ret,
          damage_qty: l.dmg,
          free_qty: l.freeQty,
          sold_qty: l.soldQty,
          price: l.price,
          manual: l.manual,
          subtotal: l.subtotal,
        })),
        ...free.map((f) => ({ product_id: f.productId, carton: 0, piece: f.qty, return_qty: 0, damage_qty: 0, free_qty: f.qty, sold_qty: 0, price: 0, manual: true, subtotal: 0, is_free: true })),
      ],
      payments,
      journal,
    },
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/business", "layout");
  const res = data as { invoice_no: string; order_id: number; status: "draft" | "finalized" };
  return { ok: true, invoiceNo: res.invoice_no, orderId: res.order_id, status: res.status };
}
