"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { today } from "@/components/erp/ui";
import { requireErp } from "@/lib/erp/auth";
import { MASTERS } from "@/lib/erp/masters";
import { post } from "@/lib/erp/post";
import { openingBalancePayload, openingStockPayload, type PartyType } from "@/lib/erp/postings";

export async function saveMaster(key: string, id: string | null, form: FormData) {
  const m = MASTERS[key];
  if (!m) throw new Error("Unknown list");
  const { supabase } = await requireErp();
  const back = (msg: string): never => redirect(`/erp/m/${key}/${id ?? "new"}?error=${encodeURIComponent(msg)}`);

  const values: Record<string, unknown> = {};
  for (const f of m.fields) {
    if (f.newOnly && id) continue;
    const raw = form.get(f.name);
    if (f.type === "checkbox") values[f.name] = raw === "on";
    else {
      const s = typeof raw === "string" ? raw.trim() : "";
      if (f.required && !s) back(`${f.label} is required.`);
      values[f.name] = s === "" ? null : f.type === "number" ? Number(s) : s;
    }
  }
  // Opening amounts aren't columns: they're posted once, after the record exists.
  const opening = Number(values.opening_balance ?? values.opening_stock ?? 0) || 0;
  delete values.opening_balance;
  delete values.opening_stock;
  if (m.opening === "stock" && opening < 0) back("Opening stock can't be negative.");

  let row = values;
  if (m.toRow) {
    const ids = m.fields.filter((f) => f.source === "products").map((f) => Number(values[f.name])).filter(Boolean);
    const { data } = ids.length ? await supabase.from("erp_products").select("id, name").in("id", ids) : { data: [] };
    const names = new Map((data ?? []).map((p) => [p.id, p.name]));
    row = m.toRow(values, { productName: (pid) => names.get(pid) });
  }

  const res = id ? await supabase.from(m.table).update(row).eq("id", id).select("id").single() : await supabase.from(m.table).insert(row).select("id").single();
  if (res.error) back(res.error.code === "23505" ? "That code or name is already used." : res.error.message);
  const newId = Number(res.data!.id);

  if (!id && opening) {
    const name = String(row[m.nameField] ?? "");
    const payload =
      m.opening === "stock"
        ? openingStockPayload({ date: today(), product_id: newId, qty: opening, rate: Number(row.buy_price) || 0, sale: Number(row.sale_price) || 0 })
        : openingBalancePayload({ date: today(), party_type: (key === "staff" ? String(row.kind) : key === "retailers" ? "retailer" : "supplier") as PartyType, party_id: newId, amount: opening, name });
    const r = await post(supabase, payload);
    if (!r.ok) redirect(`/erp/m/${key}/${newId}?error=${encodeURIComponent(`Saved, but the opening entry failed: ${r.error}`)}`);
  }
  revalidatePath(`/erp`, "layout");
  redirect(`/erp/m/${key}?saved=1`);
}

/** Masters are never hard-deleted (old invoices point at them); they're switched off instead. */
export async function setActive(key: string, id: string, active: boolean) {
  const m = MASTERS[key];
  if (!m?.hasActive) throw new Error("Unknown list");
  const { supabase } = await requireErp();
  await supabase.from(m.table).update({ active }).eq("id", id);
  revalidatePath(`/erp/m/${key}`);
}
