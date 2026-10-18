import { NextResponse, type NextRequest } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

// Landing point for links in Supabase emails (confirm sign-up, reset password).
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const safeNext = next && next.startsWith("/admin") ? next : "/admin";
  if (code) {
    const supabase = await createSessionClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL(`/admin/login?error=${encodeURIComponent(error.message)}`, url.origin));
  }
  return NextResponse.redirect(new URL(safeNext, url.origin));
}
