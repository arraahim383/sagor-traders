import type { SupabaseClient } from "@supabase/supabase-js";

export type Ctx = { supabase: SupabaseClient; key: string; from: string; to: string; month: string; monthEnd: string; partyId?: number };

export const n = (v: unknown) => Number(v ?? 0);
export const total = <T,>(rows: T[], f: (r: T) => number) => rows.reduce((s, r) => s + f(r), 0);

/** Throw on a failed report query so the error page shows it instead of an empty, wrong-looking report. */
export function rows<T>(res: { data: unknown; error: { message: string } | null }): T[] {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T[];
}
