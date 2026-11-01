"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireErp } from "@/lib/erp/auth";
import type { AccountKey } from "@/lib/erp/accounting";
import { round2 } from "@/lib/erp/money";
import { post } from "@/lib/erp/post";
import { badDebtPayload, journalVoucherPayload, PARTY_ACCOUNT } from "@/lib/erp/postings";
import type { PostResult } from "@/lib/erp/purchase-payload";

export async function addAccount(form: FormData) {
  const { supabase } = await requireErp();
  const name = String(form.get("name") ?? "").trim();
  const isCash = form.get("is_cash") === "on";
  const type = isCash ? "asset" : String(form.get("type"));
  if (!name) redirect("/erp/accounts?error=Enter+a+name.");
  // Next free code in the type's range, stepping by 10 like the system accounts (cash/bank after Nagad 1030).
  const { data: used } = await supabase.from("erp_accounts").select("code");
  const taken = new Set((used ?? []).map((a) => a.code));
  let n = isCash ? 1040 : ({ asset: 1400, liability: 2200, equity: 3200, income: 4950, expense: 6300 } as Record<string, number>)[type] ?? 9000;
  while (taken.has(String(n))) n += 10;
  const code = String(n);
  const { error } = await supabase.from("erp_accounts").insert({ code, key: null, name, type, is_cash: isCash, system: false });
  if (error) redirect(`/erp/accounts?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/erp", "layout");
  redirect("/erp/accounts?saved=Account+added.");
}

export async function saveVoucher(i: { date: string; narration: string; lines: { accountId: number; debit: number; credit: number }[] }): Promise<PostResult> {
  const { supabase } = await requireErp();
  const lines = i.lines.filter((l) => l.accountId && (l.debit > 0 || l.credit > 0));
  if (lines.length < 2) return { ok: false, error: "Add at least two lines." };
  const d = round2(lines.reduce((s, l) => s + l.debit, 0));
  const c = round2(lines.reduce((s, l) => s + l.credit, 0));
  if (d !== c) return { ok: false, error: `Not balanced — difference of ${Math.abs(d - c).toFixed(2)}.` };
  const { data: accts } = await supabase.from("erp_accounts").select("id, code").in("id", lines.map((l) => l.accountId));
  const code = new Map((accts ?? []).map((a) => [a.id, a.code]));
  // Lines are sent by account code so user-added accounts (no key) post too.
  const res = await post(supabase, journalVoucherPayload({ date: i.date, narration: i.narration || "Journal voucher", lines: lines.map((l) => ({ account: code.get(l.accountId) as AccountKey, debit: l.debit, credit: l.credit })) }));
  if (res.ok) revalidatePath("/erp", "layout");
  return res;
}

export async function saveBadDebt(form: FormData) {
  const { supabase } = await requireErp();
  const kind = String(form.get("kind")) as "estimate" | "writeoff";
  const date = String(form.get("date"));
  const note = String(form.get("note") ?? "").trim();
  const back = (m: string, ok = false): never => redirect(`/erp/bad-debts?${ok ? "saved" : "error"}=${encodeURIComponent(m)}`);
  let payload;
  if (kind === "estimate") {
    const adjustment = Number(form.get("adjustment"));
    if (!adjustment) back("Nothing to adjust — the allowance already matches.");
    payload = badDebtPayload({ date, kind, amount: adjustment, note });
  } else {
    const [pt, pid] = String(form.get("party")).split(":");
    const amount = Number(form.get("amount"));
    if (!pt || !pid || !(amount > 0)) back("Pick a party and an amount.");
    const { data: bal } = await supabase.from("erp_party_balances").select("balance").eq("party_type", pt).eq("party_id", pid).maybeSingle();
    if (amount > Number(bal?.balance ?? 0) + 0.005) back("You can't write off more than the party owes.");
    payload = badDebtPayload({ date, kind, amount, party_type: pt as keyof typeof PARTY_ACCOUNT & ("retailer" | "sr" | "dsr"), party_id: Number(pid), note });
  }
  const res = await post(supabase, payload);
  if (!res.ok) back(res.error);
  revalidatePath("/erp", "layout");
  back(`${res.ok ? res.number : ""} saved.`, true);
}
