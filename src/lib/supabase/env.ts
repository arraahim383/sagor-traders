// Fallbacks are the project's public values (same as .env.example), so preview deployments work
// even when Vercel's variables are only set for production. Row-level security protects the data.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://oahsgubjfguqtsvieqrw.supabase.co";
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_dpea13HFWInuHgTHxVomLg_8cd_nTcB";

/** True when the site is connected to a Supabase project. Without it the site runs on bundled demo content. */
export const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);
