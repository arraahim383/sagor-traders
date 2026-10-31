import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PostPayload } from "./postings";
import type { PostResult } from "./purchase-payload";

/** Sends one document to the database's posting routine (document + stock + journal in one transaction). */
export async function post(supabase: SupabaseClient, payload: PostPayload): Promise<PostResult> {
  const { data, error } = await supabase.rpc("erp_post", { p: payload });
  if (error) return { ok: false, error: error.message };
  const r = data as { id: number; number: string };
  return { ok: true, id: r.id, number: r.number };
}
