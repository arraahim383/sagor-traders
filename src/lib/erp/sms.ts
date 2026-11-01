import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fillTemplate, type SmsConfig } from "./sms-utils";

export async function loadSmsConfig(supabase: SupabaseClient): Promise<SmsConfig | null> {
  const { data } = await supabase.from("erp_settings").select("value").eq("key", "sms").maybeSingle();
  const v = data?.value as Partial<SmsConfig> | undefined;
  if (!v?.sendUrl) return null;
  return { username: v.username ?? "", password: v.password ?? "", cli: v.cli ?? "", sendUrl: v.sendUrl, balanceUrl: v.balanceUrl ?? "", billMsisdn: v.billMsisdn ?? "" };
}

/** Send one message per number (each with its own text), through the configured gateway, and log the batch. */
export async function sendSms(supabase: SupabaseClient, kind: string, items: { to: string; msg: string }[]) {
  const cfg = await loadSmsConfig(supabase);
  if (!cfg) return { ok: false as const, error: "SMS isn't set up yet. Enter the gateway details under SMS API setup." };
  let sent = 0;
  const failures: string[] = [];
  for (const it of items) {
    try {
      const res = await fetch(fillTemplate(cfg.sendUrl, cfg, it.to, it.msg), { cache: "no-store", signal: AbortSignal.timeout(15000) });
      const body = (await res.text()).slice(0, 300);
      if (res.ok) sent++;
      else failures.push(`${it.to}: HTTP ${res.status} ${body}`);
    } catch (e) {
      failures.push(`${it.to}: ${e instanceof Error ? e.message : "failed"}`);
    }
  }
  const messages = [...new Set(items.map((i) => i.msg))];
  await supabase.from("erp_sms_log").insert({
    kind,
    numbers: items.map((i) => i.to),
    message: messages.length === 1 ? messages[0] : `${messages[0]} (+${messages.length - 1} personalised)`,
    status: failures.length === 0 ? "sent" : sent ? "partly sent" : "failed",
    response: failures.slice(0, 20).join("\n") || null,
  });
  return { ok: true as const, sent, failed: failures.length, firstError: failures[0] };
}

export async function smsBalance(supabase: SupabaseClient) {
  const cfg = await loadSmsConfig(supabase);
  if (!cfg?.balanceUrl) return null;
  try {
    const res = await fetch(fillTemplate(cfg.balanceUrl, cfg), { cache: "no-store", signal: AbortSignal.timeout(15000) });
    return (await res.text()).slice(0, 500);
  } catch (e) {
    return `Couldn't reach the gateway: ${e instanceof Error ? e.message : "error"}`;
  }
}
