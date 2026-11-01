"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireErp } from "@/lib/erp/auth";
import type { CashAccount } from "@/lib/erp/accounting";
import { post } from "@/lib/erp/post";
import { cashEntryPayload } from "@/lib/erp/postings";

const back = (msg: string, ok = false): never => redirect(`/erp/cashbook?${ok ? "saved" : "error"}=${encodeURIComponent(msg)}`);

export async function saveCashEntry(form: FormData) {
  const { supabase } = await requireErp();
  const kind = String(form.get("kind")) as "receive" | "payment" | "transfer" | "adjustment";
  const amount = Number(form.get("amount"));
  if (!(amount > 0)) back("Enter an amount.");
  const { data: accts } = await supabase.from("erp_accounts").select("id, key, code").eq("is_cash", true);
  // System accounts post by key, accounts added later by their code — the database accepts either.
  const keyOf = (id: number) => {
    const a = (accts ?? []).find((x) => x.id === id);
    return (a ? a.key ?? a.code : undefined) as CashAccount | undefined;
  };
  const accountId = Number(form.get("account_id"));
  const toId = Number(form.get("to_account_id")) || undefined;
  if (!keyOf(accountId)) back("Pick an account.");
  if (kind === "transfer" && (!toId || toId === accountId || !keyOf(toId))) back("Pick two different accounts to transfer between.");
  const categoryId = Number(form.get("category_id")) || null;
  let categoryKind: "income" | "expense" | "transfer" | null = null;
  if (categoryId) categoryKind = ((await supabase.from("erp_cash_categories").select("kind").eq("id", categoryId).maybeSingle()).data?.kind ?? null) as typeof categoryKind;
  if ((kind === "payment" || kind === "receive") && !categoryId) back("Pick a category.");

  const res = await post(
    supabase,
    cashEntryPayload({
      date: String(form.get("date")),
      kind,
      account: keyOf(accountId)!,
      account_id: accountId,
      to_account: toId ? keyOf(toId) : undefined,
      to_account_id: toId,
      category_id: categoryId,
      category_kind: categoryKind,
      amount,
      direction: (form.get("direction") as "increase" | "decrease") || undefined,
      description: String(form.get("description") ?? "").trim(),
      ref_no: String(form.get("ref_no") ?? "").trim(),
    }),
  );
  if (!res.ok) back(res.error);
  revalidatePath("/erp", "layout");
  back(`${res.ok ? res.number : ""} saved.`, true);
}
