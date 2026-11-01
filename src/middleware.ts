import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canOpen, moduleFor } from "@/lib/erp/nav";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

// Keeps the admin's Supabase session fresh, and keeps ERP users inside the modules their role allows.
// Public pages never touch cookies, so they stay cacheable.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!SUPABASE_URL || !SUPABASE_KEY) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (path.startsWith("/erp/") && user) {
    const area = moduleFor(path);
    if (area !== "home") {
      const { data } = await supabase.rpc("erp_my_modules");
      if (!canOpen((data as string[] | null) ?? null, area)) {
        const url = request.nextUrl.clone();
        url.pathname = "/erp";
        url.search = `?denied=${area}`;
        return NextResponse.redirect(url);
      }
    }
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/auth/:path*", "/erp", "/erp/:path*"],
};
