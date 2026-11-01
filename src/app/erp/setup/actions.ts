"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireErpAdmin } from "@/lib/erp/auth";
import { BUSINESS_NAV } from "@/lib/erp/nav";

const go = (path: string, msg: string, ok = true): never => redirect(`${path}?${ok ? "saved" : "error"}=${encodeURIComponent(msg)}`);
const ROLES = ["administrator", "manager", "staff", "sr", "dsr"];

export async function saveUser(form: FormData) {
  const { supabase } = await requireErpAdmin();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const role = String(form.get("role"));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) go("/erp/setup/users", "Enter a valid email.", false);
  if (!ROLES.includes(role)) go("/erp/setup/users", "Pick a role.", false);
  const { error } = await supabase.from("erp_user_roles").upsert({
    email,
    role,
    name: String(form.get("name") ?? "").trim() || null,
    phone: String(form.get("phone") ?? "").trim() || null,
    updated_at: new Date().toISOString(),
  });
  if (error) go("/erp/setup/users", error.message, false);
  revalidatePath("/erp", "layout");
  go("/erp/setup/users", `${email} can now use the ERP as ${role}.`);
}

export async function removeUser(email: string) {
  const { supabase, email: me } = await requireErpAdmin();
  if (email === me) go("/erp/setup/users", "You can't remove your own access.", false);
  const { error } = await supabase.from("erp_user_roles").delete().eq("email", email);
  if (error) go("/erp/setup/users", error.message, false);
  go("/erp/setup/users", `${email} removed from the ERP.`);
}

export async function saveRoles(form: FormData) {
  const { supabase } = await requireErpAdmin();
  const modules = BUSINESS_NAV.map((g) => g.key).filter((k) => k !== "home" && k !== "setup");
  const value: Record<string, string[]> = {};
  for (const role of ["manager", "staff", "sr", "dsr"]) value[role] = ["home", ...modules.filter((m) => form.get(`${role}:${m}`) === "on")];
  const { error } = await supabase.from("erp_settings").upsert({ key: "roles", value });
  if (error) go("/erp/setup/roles", error.message, false);
  revalidatePath("/erp", "layout");
  go("/erp/setup/roles", "Permissions saved.");
}

export async function saveCompany(form: FormData) {
  const { supabase } = await requireErpAdmin();
  const value = Object.fromEntries(["name", "address", "phone", "email", "receipt_footer", "logo_url"].map((k) => [k, String(form.get(k) ?? "").trim()]));
  if (!value.name) go("/erp/setup/company", "Company name is required.", false);
  const { error } = await supabase.from("erp_settings").upsert({ key: "company", value });
  if (error) go("/erp/setup/company", error.message, false);
  revalidatePath("/erp", "layout");
  go("/erp/setup/company", "Company details saved.");
}
