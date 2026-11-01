"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireErp } from "@/lib/erp/auth";
import type { CashAccount } from "@/lib/erp/accounting";
import { post } from "@/lib/erp/post";
import { claimPayload, claimReceiptPayload } from "@/lib/erp/postings";

const back = (msg: string, ok = false): never => redirect(`/erp/claims?${ok ? "saved" : "error"}=${encodeURIComponent(msg)}`);

/** Damage claim (lines from damaged stock), rate-difference claim or a general/cash claim. */
export async function createClaim(form: FormData) {
  const { supabase } = await requireErp();
  const supplierId = Number(form.get("supplier_id"));
  const type = String(form.get("type")) as "Damage" | "Rate Difference" | "General";
  const date = String(form.get("date"));
  const remark = String(form.get("remark") ?? "").trim();
  if (!supplierId) back("Select a supplier.");

  let lines: { product_id: number; qty: number; price: number }[] | undefined;
  if (type === "Damage") {
    const { data: avail } = await supabase.from("erp_damage_stock").select("product_id, damaged, claimed");
    const left = new Map((avail ?? []).map((a) => [Number(a.product_id), Number(a.damaged) - Number(a.claimed)]));
    lines = [];
    for (const [k, v] of form.entries()) {
      const m = /^qty_(\d+)$/.exec(k);
      const q = Number(v);
      if (!m || !(q > 0)) continue;
      const pid = Number(m[1]);
      if (q > (left.get(pid) ?? 0) + 1e-9) back(`Only ${left.get(pid) ?? 0} damaged pieces are available to claim for one of the products.`);
      lines.push({ product_id: pid, qty: q, price: Number(form.get(`price_${pid}`)) || 0 });
    }
    if (!lines.length) back("Add at least one line with quantity.");
  }
  const amount = Number(form.get("amount")) || 0;
  if (type !== "Damage" && !(amount > 0)) back("Enter the claim amount.");

  const res = await post(
    supabase,
    claimPayload({ date, supplier_id: supplierId, type, amount, lines, remark, period_from: (form.get("period_from") as string) || null, period_to: (form.get("period_to") as string) || null }),
  );
  if (!res.ok) back(res.error);
  // Cash claim with part of it paid on the spot.
  const paidNow = Number(form.get("paid")) || 0;
  if (res.ok && paidNow > 0) {
    const r2 = await post(supabase, claimReceiptPayload({ date, claim_id: res.id, supplier_id: supplierId, amount: paidNow, account: "cash", mode: "Cash", remark: "Paid with claim" }));
    if (!r2.ok) back(`Claim ${res.number} saved, but the payment failed: ${r2.error}`);
  }
  revalidatePath("/erp", "layout");
  back(`${res.ok ? res.number : ""} sent to the supplier.`, true);
}

export async function receiveClaim(claimId: number, form: FormData) {
  const { supabase } = await requireErp();
  const { data: c } = await supabase.from("erp_claims").select("supplier_id, claimed, received, claim_no").eq("id", claimId).maybeSingle();
  if (!c) back("Claim not found.");
  const due = Number(c!.claimed) - Number(c!.received);
  const amount = Number(form.get("amount"));
  if (!(amount > 0) || amount > due + 0.005) back(`Enter an amount up to the claim's due (${due.toFixed(2)}).`);
  const res = await post(
    supabase,
    claimReceiptPayload({ date: String(form.get("date")), claim_id: claimId, supplier_id: c!.supplier_id, amount, account: String(form.get("account")) as CashAccount, mode: String(form.get("mode")), remark: String(form.get("remark") ?? "") }),
  );
  if (!res.ok) back(res.error);
  revalidatePath("/erp", "layout");
  back(`Received ${amount.toFixed(2)} against ${c!.claim_no}.`, true);
}
