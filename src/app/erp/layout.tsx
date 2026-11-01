import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Logo } from "@/components/decor";
import { ErpShell } from "@/components/erp/ErpShell";
import { getErpContext } from "@/lib/erp/auth";
import { hasSupabase } from "@/lib/supabase/env";
import { signOut } from "../admin/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: { default: "Business ERP", template: "%s · Sagor Traders ERP" } };

const ROLE_LABEL: Record<string, string> = { administrator: "Administrator", manager: "Manager", staff: "Staff", sr: "SR", dsr: "DSR" };

export default async function ErpLayout({ children }: { children: React.ReactNode }) {
  if (!hasSupabase) redirect("/admin/login?next=/erp");
  const ctx = await getErpContext();
  if (!ctx.user) redirect("/admin/login?next=/erp");
  if (!ctx.access) {
    return (
      <main className="grid min-h-screen place-items-center px-5">
        <div className="max-w-lg rounded-[28px] bg-white p-8 shadow-card sm:p-10">
          <div className="text-[2rem]"><Logo text="Sagor Traders" /></div>
          <h1 className="mt-6 text-2xl font-extrabold text-forest-900">No ERP access yet</h1>
          <p className="mt-3 text-ink-600">
            You&apos;re signed in as <strong className="text-ink-900">{ctx.user.email}</strong>. An ERP administrator can add this email under <em>Users &amp; Setup → Users</em>.
          </p>
          <form action={signOut} className="mt-6">
            <button className="rounded-full border-2 border-forest-800 px-5 py-2.5 text-sm font-bold text-forest-800">Sign out</button>
          </form>
        </div>
      </main>
    );
  }
  const { data: modules } = await ctx.supabase.rpc("erp_my_modules");
  const roleLabel = ctx.access.siteRole === "admin" ? "Administrator (website admin)" : ROLE_LABEL[ctx.access.erpRole] ?? ctx.access.erpRole;
  return (
    <Suspense>
      <ErpShell email={ctx.user.email ?? ""} roleLabel={roleLabel} modules={(modules as string[] | null) ?? null} signOut={signOut}>
        {children}
      </ErpShell>
    </Suspense>
  );
}
