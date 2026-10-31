"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/admin/auth";
import { post } from "@/lib/erp/post";
import { damageNotePayload, stockAdjustPayload } from "@/lib/erp/postings";

/** Stock increase/decrease, new damage, damage reduced back into stock, or damaged goods recovered. */
export async function saveStockAction(form: FormData) {
  const { supabase } = await requireStaff();
  const productId = Number(form.get("product_id"));
  const action = String(form.get("action"));
  const qtyN = Number(form.get("qty"));
  const date = String(form.get("date"));
  const reason = String(form.get("reason") ?? "").trim();
  const typedRate = Number(form.get("rate"));
  const back = (msg: string, ok = false) => redirect(`/admin/business/stock/adjust?${ok ? "saved" : "error"}=${encodeURIComponent(msg)}`);
  if (!productId || !(qtyN > 0)) back("Pick a product and enter a quantity.");
  const { data: p } = await supabase.from("erp_products").select("name, buy_price, sale_price").eq("id", productId).maybeSingle();
  if (!p) back("Product not found.");
  // Coming back into stock is valued at the typed rate, else the product's buy price (same default as Rushda).
  const rate = typedRate > 0 ? typedRate : Number(p!.buy_price);
  const sale = Number(p!.sale_price);

  const payload =
    action === "increase" || action === "decrease"
      ? stockAdjustPayload({ date, product_id: productId, direction: action === "increase" ? "in" : "out", qty: qtyN, rate, sale, reason })
      : damageNotePayload({ date, product_id: productId, kind: action as "damage" | "reduce" | "recover", qty: qtyN, rate: action === "damage" ? typedRate || 0 : rate, sale, remark: reason });
  const res = await post(supabase, payload);
  if (!res.ok) back(res.error);
  revalidatePath("/admin/business", "layout");
  back(`${res.ok ? res.number : ""} saved for ${p!.name}.`, true);
}
