"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/admin/auth";
import { RESOURCES, SETTINGS_GROUPS, type Field } from "@/lib/admin/schema";
import { slugify } from "@/lib/utils";

function refreshSite() {
  revalidatePath("/", "layout");
}

function readField(f: Field, form: FormData): unknown {
  const raw = form.get(f.name);
  switch (f.type) {
    case "checkbox":
      return form.get(f.name) === "on";
    case "number": {
      const s = typeof raw === "string" ? raw.trim() : "";
      if (!s) return null;
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    }
    default: {
      const s = typeof raw === "string" ? raw.replace(/\r/g, "").trim() : "";
      return s || null;
    }
  }
}

function payloadFor(fields: Field[], form: FormData) {
  const out: Record<string, unknown> = {};
  for (const f of fields) out[f.name] = readField(f, form);
  return out;
}

export async function saveResource(key: string, id: string | null, form: FormData) {
  const res = RESOURCES[key];
  if (!res) throw new Error("Unknown section");
  const { supabase } = await requireStaff();
  const data = payloadFor(res.fields, form);
  for (const f of res.fields) {
    if (f.required && !data[f.name]) redirect(`/admin/${key}/${id ?? "new"}?error=${encodeURIComponent(`${f.label} is required.`)}`);
    if (f.type === "number" && data[f.name] === null && f.defaultValue !== undefined) data[f.name] = f.defaultValue;
  }
  if (res.slugFrom) data.slug = slugify(String(data.slug || data[res.slugFrom] || "")) || `item-${Date.now()}`;

  const query = id ? supabase.from(res.table).update(data).eq("id", id) : supabase.from(res.table).insert(data);
  const { error } = await query;
  if (error) {
    const msg = error.code === "23505" ? "That web address is already used. Pick another." : error.message;
    redirect(`/admin/${key}/${id ?? "new"}?error=${encodeURIComponent(msg)}`);
  }
  // Only one brand can be the centre bubble.
  if (key === "brands" && data.is_parent && data.slug) {
    await supabase.from("brands").update({ is_parent: false }).neq("slug", data.slug as string).eq("is_parent", true);
  }
  refreshSite();
  redirect(`/admin/${key}?saved=1`);
}

export async function deleteResource(key: string, id: string) {
  const res = RESOURCES[key];
  if (!res) throw new Error("Unknown section");
  const { supabase } = await requireStaff();
  const { error } = await supabase.from(res.table).delete().eq("id", id);
  if (error) redirect(`/admin/${key}?error=${encodeURIComponent(error.message)}`);
  refreshSite();
  redirect(`/admin/${key}?deleted=1`);
}

export async function saveSettings(form: FormData) {
  const { supabase } = await requireStaff();
  const fields = SETTINGS_GROUPS.flatMap((g) => g.fields);
  const data = payloadFor(fields, form);
  if (!data.company_name) redirect(`/admin/settings?error=${encodeURIComponent("Company name is required.")}`);
  const stats = [0, 1, 2]
    .map((i) => ({
      icon: String(form.get(`stat_icon_${i}`) || "truck"),
      value: String(form.get(`stat_value_${i}`) || "").trim(),
      label: String(form.get(`stat_label_${i}`) || "").trim(),
    }))
    .filter((s) => s.label);
  const { error } = await supabase.from("site_settings").update({ ...data, stats }).eq("id", 1);
  if (error) redirect(`/admin/settings?error=${encodeURIComponent(error.message)}`);
  refreshSite();
  redirect("/admin/settings?saved=1");
}

export async function updateInquiry(id: string, form: FormData) {
  const { supabase } = await requireStaff();
  const status = String(form.get("status") || "new");
  const note = String(form.get("staff_note") || "").trim() || null;
  if (!["new", "contacted", "closed"].includes(status)) return;
  await supabase.from("inquiries").update({ status, staff_note: note }).eq("id", id);
  revalidatePath("/admin", "layout");
}

export async function deleteInquiry(id: string) {
  const { supabase } = await requireStaff();
  await supabase.from("inquiries").delete().eq("id", id);
  revalidatePath("/admin", "layout");
}

export async function addStaff(form: FormData) {
  const { supabase, role } = await requireStaff();
  if (role !== "admin") redirect("/admin/account?error=Only+admins+can+add+staff.");
  const email = String(form.get("email") || "").trim().toLowerCase();
  const newRole = form.get("role") === "admin" ? "admin" : "editor";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/admin/account?error=Enter+a+valid+email.");
  const { error } = await supabase.from("staff").upsert({ email, role: newRole });
  if (error) redirect(`/admin/account?error=${encodeURIComponent(error.message)}`);
  redirect("/admin/account?saved=1");
}

export async function removeStaff(email: string) {
  const { supabase, role, email: me } = await requireStaff();
  if (role !== "admin" || email === me) redirect("/admin/account?error=You+can%27t+remove+that+account.");
  await supabase.from("staff").delete().eq("email", email);
  redirect("/admin/account?saved=1");
}

export async function signOut() {
  const { createSessionClient } = await import("@/lib/supabase/server");
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
