"use server";

import { revalidatePath } from "next/cache";
import { requireErp } from "@/lib/erp/auth";
import { post } from "@/lib/erp/post";
import { paymentPayload } from "@/lib/erp/postings";
import type { PayInput } from "@/components/erp/PaymentForm";
import type { PostResult } from "@/lib/erp/purchase-payload";

const TABLE = { retailer: "erp_retailers", sr: "erp_staff", dsr: "erp_staff", supplier: "erp_suppliers", staff: "erp_staff" } as const;

export async function savePayment(i: PayInput): Promise<PostResult> {
  const { supabase } = await requireErp();
  if (!i.partyId) return { ok: false, error: "Pick who the money is from or to." };
  if (!(i.amount >= 0) || !(i.less >= 0) || i.amount + i.less <= 0) return { ok: false, error: "Enter an amount." };
  const { data: party } = await supabase.from(TABLE[i.partyType]).select("name").eq("id", i.partyId).maybeSingle();
  if (!party) return { ok: false, error: "That party wasn't found." };
  const res = await post(
    supabase,
    paymentPayload({ date: i.date, party_type: i.partyType, party_id: i.partyId, amount: i.amount, less: i.less, account: i.account, mode: i.mode, ref_invoice: i.refInvoice, remark: i.remark, partyName: party.name }),
  );
  if (res.ok) revalidatePath("/erp", "layout");
  return res;
}
