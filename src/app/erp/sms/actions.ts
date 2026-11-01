"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireErp, requireErpAdmin } from "@/lib/erp/auth";
import { sendSms } from "@/lib/erp/sms";
import { normalizeBdMobile, parseNumbers, renderDueMessage } from "@/lib/erp/sms-utils";

const go = (path: string, msg: string, ok = true): never => redirect(`${path}?${ok ? "saved" : "error"}=${encodeURIComponent(msg)}`);
const MAX = 1000;

function report(path: string, r: Awaited<ReturnType<typeof sendSms>>) {
  if (!r.ok) go(path, r.error, false);
  revalidatePath("/erp/sms/log");
  if (r.ok && r.failed) go(path, `Sent ${r.sent}, failed ${r.failed}. First error: ${r.firstError}`, false);
  go(path, `Sent ${r.ok ? r.sent : 0} message(s).`);
}

export async function sendSingle(form: FormData) {
  const { supabase } = await requireErp();
  const msg = String(form.get("message") ?? "").trim();
  const { numbers, rejected } = parseNumbers(String(form.get("numbers") ?? ""));
  if (!msg) go("/erp/sms", "Write a message.", false);
  if (rejected.length) go("/erp/sms", `Not valid mobile numbers: ${rejected.slice(0, 5).join(", ")}`, false);
  if (!numbers.length) go("/erp/sms", "Add at least one mobile number.", false);
  report("/erp/sms", await sendSms(supabase, "single", numbers.slice(0, MAX).map((to) => ({ to, msg }))));
}

/** Bulk: one message to everyone in a group (all retailers, one route's retailers, suppliers, SR/DSR, staff). */
export async function sendBulk(form: FormData) {
  const { supabase } = await requireErp();
  const msg = String(form.get("message") ?? "").trim();
  const group = String(form.get("group"));
  if (!msg) go("/erp/sms/bulk", "Write a message.", false);
  let mobiles: (string | null)[] = [];
  if (group === "retailers" || group.startsWith("route:")) {
    for (let from = 0; ; from += 1000) {
      let q = supabase.from("erp_retailers").select("mobile").eq("active", true).not("mobile", "is", null);
      if (group.startsWith("route:")) q = q.eq("route_id", Number(group.slice(6)));
      const { data } = await q.order("id").range(from, from + 999);
      mobiles.push(...(data ?? []).map((r) => r.mobile));
      if (!data || data.length < 1000) break;
    }
  } else if (group === "suppliers") {
    mobiles = ((await supabase.from("erp_suppliers").select("mobile")).data ?? []).map((r) => r.mobile);
  } else {
    const kinds = group === "srdsr" ? ["sr", "dsr"] : ["staff", "sr", "dsr"];
    mobiles = ((await supabase.from("erp_staff").select("mobile").eq("active", true).in("kind", kinds)).data ?? []).map((r) => r.mobile);
  }
  const numbers = [...new Set(mobiles.map((m) => (m ? normalizeBdMobile(m) : null)).filter((m): m is string => !!m))];
  if (!numbers.length) go("/erp/sms/bulk", "Nobody in that group has a valid mobile number.", false);
  if (numbers.length > MAX) go("/erp/sms/bulk", `That group has ${numbers.length} numbers; send to at most ${MAX} at a time (pick a route).`, false);
  report("/erp/sms/bulk", await sendSms(supabase, "bulk", numbers.map((to) => ({ to, msg }))));
}

/** Due SMS: a personalised reminder to each ticked party, with their own name and due amount. */
export async function sendDue(form: FormData) {
  const { supabase } = await requireErp();
  const template = String(form.get("template") ?? "").trim();
  const company = String(form.get("company") ?? "");
  if (!template) go("/erp/sms/due", "Write the reminder text.", false);
  const items: { to: string; msg: string }[] = [];
  for (const [k, v] of form.entries()) {
    if (!k.startsWith("pick:") || v !== "on") continue;
    const [, mobile, due, ...name] = k.split(":");
    const to = normalizeBdMobile(mobile);
    if (to) items.push({ to, msg: renderDueMessage(template, { name: name.join(":"), due: Number(due), company }) });
  }
  if (!items.length) go(`/erp/sms/due?group=${form.get("group")}`, "Tick at least one party with a mobile number.", false);
  report(`/erp/sms/due?group=${form.get("group")}`, await sendSms(supabase, "due", items.slice(0, MAX)));
}

export async function saveSmsSetup(form: FormData) {
  const { supabase } = await requireErpAdmin();
  const { data } = await supabase.from("erp_settings").select("value").eq("key", "sms").maybeSingle();
  const old = (data?.value ?? {}) as Record<string, string>;
  const get = (k: string) => String(form.get(k) ?? "").trim();
  const value = {
    username: get("username"),
    // Leave the password box empty to keep the saved one.
    password: get("password") || old.password || "",
    cli: get("cli"),
    sendUrl: get("sendUrl"),
    balanceUrl: get("balanceUrl"),
    billMsisdn: get("billMsisdn"),
  };
  if (value.sendUrl && !/^https?:\/\//.test(value.sendUrl)) go("/erp/sms/setup", "The send URL must start with http:// or https://", false);
  if (value.sendUrl && !value.sendUrl.includes("{to}")) go("/erp/sms/setup", "The send URL needs {to} and {msg} where the number and message go.", false);
  const { error } = await supabase.from("erp_settings").upsert({ key: "sms", value });
  if (error) go("/erp/sms/setup", error.message, false);
  go("/erp/sms/setup", "SMS settings saved.");
}
