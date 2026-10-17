export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** True when the site is connected to a Supabase project. Without it the site runs on bundled demo content. */
export const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);
