"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/admin/auth";
import { MASTERS } from "@/lib/erp/masters";

export async function saveMaster(key: string, id: string | null, form: FormData) {
  const m = MASTERS[key];
  if (!m) throw new Error("Unknown list");
  const { supabase } = await requireStaff();

  const values: Record<string, unknown> = {};
  for (const f of m.fields) {
    const raw = form.get(f.name);
    if (f.type === "checkbox") values[f.name] = raw === "on";
    else {
      const s = typeof raw === "string" ? raw.trim() : "";
      if (f.required && !s) redirect(`/admin/business/m/${key}/${id ?? "new"}?error=${encodeURIComponent(`${f.label} is required.`)}`);
      values[f.name] = s === "" ? null : f.type === "number" ? Number(s) : s;
    }
  }

  let row = values;
  if (m.toRow) {
    const ids = m.fields.filter((f) => f.source === "products").map((f) => Number(values[f.name])).filter(Boolean);
    const { data } = ids.length ? await supabase.from("erp_products").select("id, name").in("id", ids) : { data: [] };
    const names = new Map((data ?? []).map((p) => [p.id, p.name]));
    row = m.toRow(values, { productName: (pid) => names.get(pid) });
  }

  const { error } = id ? await supabase.from(m.table).update(row).eq("id", id) : await supabase.from(m.table).insert(row);
  if (error) {
    const msg = error.code === "23505" ? "That code or name is already used." : error.message;
    redirect(`/admin/business/m/${key}/${id ?? "new"}?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath(`/admin/business`, "layout");
  redirect(`/admin/business/m/${key}?saved=1`);
}

/** Masters are never hard-deleted (old invoices point at them); they're switched off instead. */
export async function setActive(key: string, id: string, active: boolean) {
  const m = MASTERS[key];
  if (!m?.hasActive) throw new Error("Unknown list");
  const { supabase } = await requireStaff();
  await supabase.from(m.table).update({ active }).eq("id", id);
  revalidatePath(`/admin/business/m/${key}`);
}
