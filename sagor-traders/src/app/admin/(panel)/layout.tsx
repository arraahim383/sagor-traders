import { redirect } from "next/navigation";
import { Logo } from "@/components/decor";
import { AdminNav } from "@/components/admin/AdminNav";
import { getAdminContext } from "@/lib/admin/auth";
import { hasSupabase } from "@/lib/supabase/env";
import { signOut } from "../actions";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!hasSupabase) redirect("/admin/login");
  const ctx = await getAdminContext();
  const user = ctx.user;
  if (!user) redirect("/admin/login");
  const role = ctx.role as "admin" | "editor" | null;

  if (!role) {
    return (
      <main className="grid min-h-screen place-items-center px-5">
        <div className="max-w-lg rounded-[28px] bg-white p-8 shadow-card sm:p-10">
          <div className="text-[2rem]">
            <Logo text="Sagor Traders" />
          </div>
          <h1 className="mt-6 text-2xl font-extrabold text-forest-900">Waiting for access</h1>
          <p className="mt-3 text-ink-600">
            You&apos;re signed in as <strong className="text-ink-900">{user.email}</strong>, but this account isn&apos;t on the staff list yet.
            An existing admin can add you under <em>Account → Staff</em>.
          </p>
          <p className="mt-3 text-sm text-ink-600">
            Setting up the very first admin? Add this email to the <code>staff</code> table in the Supabase dashboard with the role <code>admin</code>, then reload this page.
          </p>
          <form action={signOut} className="mt-6">
            <button className="rounded-full border-2 border-forest-800 px-5 py-2.5 text-sm font-bold text-forest-800">Sign out</button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <div className="lg:grid lg:grid-cols-[260px_1fr]">
      <AdminNav email={user.email ?? ""} role={role} signOut={signOut} />
      <main className="min-w-0 px-5 pb-20 pt-6 md:px-10 lg:pt-10">{children}</main>
    </div>
  );
}
