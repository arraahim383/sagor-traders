import "server-only";
import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";

export type StaffContext = {
  supabase: Awaited<ReturnType<typeof createSessionClient>>;
  email: string;
  role: "admin" | "editor";
};

/** Signed-in user + their staff role, or null role when the account is not on the staff list yet. */
export async function getAdminContext() {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { supabase, user: null, role: null } as const;
  const { data } = await supabase.from("staff").select("role").eq("email", user.email.toLowerCase()).maybeSingle();
  return { supabase, user, role: (data?.role as StaffContext["role"]) ?? null } as const;
}

/** For server actions: throws the visitor back to the login page unless they are staff. */
export async function requireStaff(): Promise<StaffContext> {
  const ctx = await getAdminContext();
  if (!ctx.user) redirect("/admin/login");
  if (!ctx.role) redirect("/admin");
  return { supabase: ctx.supabase, email: ctx.user.email!, role: ctx.role };
}
