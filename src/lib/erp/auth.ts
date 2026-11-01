import "server-only";
import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";

export type ErpContext = {
  supabase: Awaited<ReturnType<typeof createSessionClient>>;
  email: string;
  /** Website staff role, when the person is also website staff. */
  siteRole: "admin" | "editor" | null;
  /** ERP role; website staff without one count as managers (admins as administrators). */
  erpRole: string;
};

/** Signed-in user and their ERP access: website staff, or anyone added under Users & Setup. */
export async function getErpContext() {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { supabase, user: null, access: null } as const;
  const email = user.email.toLowerCase();
  const [{ data: site }, { data: erp }] = await Promise.all([
    supabase.from("staff").select("role").eq("email", email).maybeSingle(),
    supabase.from("erp_user_roles").select("role").eq("email", email).maybeSingle(),
  ]);
  const siteRole = (site?.role as ErpContext["siteRole"]) ?? null;
  if (!siteRole && !erp) return { supabase, user, access: null } as const;
  const erpRole = siteRole === "admin" ? "administrator" : (erp?.role ?? "manager");
  return { supabase, user, access: { siteRole, erpRole } } as const;
}

/** For ERP pages and actions: back to the login page unless the visitor has ERP access. */
export async function requireErp(): Promise<ErpContext> {
  const ctx = await getErpContext();
  if (!ctx.user) redirect("/admin/login?next=/erp");
  if (!ctx.access) redirect("/erp");
  return { supabase: ctx.supabase, email: ctx.user.email!.toLowerCase(), ...ctx.access };
}

/** Users & Setup: ERP administrators (and website admins) only. */
export async function requireErpAdmin(): Promise<ErpContext> {
  const ctx = await requireErp();
  if (ctx.erpRole !== "administrator") redirect("/erp?denied=setup");
  return ctx;
}
