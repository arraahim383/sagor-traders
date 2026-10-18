import { redirect } from "next/navigation";
import { Logo } from "@/components/decor";
import { LoginForm } from "@/components/admin/LoginForm";
import { hasSupabase } from "@/lib/supabase/env";
import { getAdminContext } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  if (hasSupabase) {
    const ctx = await getAdminContext();
    if (ctx.user) redirect("/admin");
  }
  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_20%_10%,#e3efcf,transparent_45%),radial-gradient(circle_at_90%_90%,#d8e9ef,transparent_40%)] px-5">
      <div className="w-full max-w-md rounded-[28px] bg-white p-8 shadow-card sm:p-10">
        <div className="mb-8 text-center text-[2.2rem]">
          <Logo text="Sagor Traders" />
          <p className="mt-2 text-sm font-semibold tracking-wide text-ink-600">Website admin</p>
        </div>
        {hasSupabase ? (
          <LoginForm initialError={error} />
        ) : (
          <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
            This site is running on demo content. Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> to enable the admin.
          </p>
        )}
      </div>
    </main>
  );
}
