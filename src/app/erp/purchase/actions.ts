"use server";

import { revalidatePath } from "next/cache";
import { requireErp } from "@/lib/erp/auth";
import { partyBalances } from "@/lib/erp/data";
import { post } from "@/lib/erp/post";
import { goodsReceivePayload, purchaseOrderPayload } from "@/lib/erp/postings";
import type { PostResult, PurchaseInput } from "@/lib/erp/purchase-payload";

/** Saves a purchase order or a goods receive. Quantities use each product's pieces-per-carton from the database. */
export async function savePurchase(input: PurchaseInput): Promise<PostResult> {
  const { supabase } = await requireErp();
  const freeLines = (input.freeLines ?? []).filter((f) => f.qty > 0);
  const ids = [...input.lines.map((l) => l.productId), ...freeLines.map((f) => f.productId)];
  if (!input.supplierId) return { ok: false, error: "Select a supplier." };
  const { data: prods } = await supabase.from("erp_products").select("id, per, supplier_id, sale_price").in("id", ids.length ? ids : [-1]);
  const per = new Map((prods ?? []).map((p) => [p.id, p.per as number]));
  const salePrice = new Map((prods ?? []).map((p) => [p.id, Number(p.sale_price)]));
  const lines = input.lines.filter((l) => per.has(l.productId) && (l.carton + l.piece > 0 || l.free > 0));
  if (!lines.length) return { ok: false, error: "Add at least one line with quantity." };

  if (input.mode === "po") {
    const res = await post(
      supabase,
      purchaseOrderPayload({
        date: input.date,
        supplier_id: input.supplierId,
        remark: input.remark,
        lines: [
          ...lines.map((l) => ({ product_id: l.productId, carton: l.carton, piece: l.piece, per: per.get(l.productId)!, buy_price: l.buy })),
          ...freeLines.filter((f) => per.has(f.productId)).map((f) => ({ product_id: f.productId, carton: 0, piece: f.qty, per: per.get(f.productId)!, buy_price: 0, is_free: true })),
        ],
      }),
    );
    if (res.ok) revalidatePath("/erp", "layout");
    return res;
  }

  // A supplier we've paid ahead of delivery has a debit balance: that advance is used before creating a new due.
  const bal = (await partyBalances(supabase, "supplier", [input.supplierId])).get(input.supplierId) ?? 0;
  const payload = goodsReceivePayload({
    date: input.date,
    supplier_id: input.supplierId,
    invoice_no: input.invoiceNo,
    po_id: input.poId ?? null,
    commission: input.commission,
    transport: input.transport,
    paid: input.paid,
    fullPaid: input.fullPaid,
    advanceAvailable: Math.max(0, bal),
    account: input.account,
    mode: input.payMode,
    lines: [
      ...lines.map((l) => ({ product_id: l.productId, carton: l.carton, piece: l.piece, per: per.get(l.productId)!, free_qty: l.free, buy_price: l.buy, sale_price: l.sale })),
      // Offers only apply when not receiving against a PO (the PO already carried them).
      ...(input.poId ? [] : freeLines.filter((f) => per.has(f.productId)).map((f) => ({ product_id: f.productId, carton: 0, piece: f.qty, per: per.get(f.productId)!, free_qty: 0, buy_price: 0, sale_price: salePrice.get(f.productId) ?? 0, is_free: true }))),
    ],
  });
  const res = await post(supabase, payload);
  if (res.ok) {
    // Latest receive sets the product's current buy and sale price, as in Rushda.
    await Promise.all(lines.filter((l) => l.buy > 0).map((l) => supabase.from("erp_products").update({ buy_price: l.buy, sale_price: l.sale }).eq("id", l.productId)));
    revalidatePath("/erp", "layout");
  }
  return res;
}
