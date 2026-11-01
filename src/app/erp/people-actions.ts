"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireErp } from "@/lib/erp/auth";
import { post } from "@/lib/erp/post";
import { salaryDeclarationPayload } from "@/lib/erp/postings";

const go = (path: string, msg: string, ok = true): never => redirect(`${path}?${ok ? "saved" : "error"}=${encodeURIComponent(msg)}`);

export async function saveTargets(form: FormData) {
  const { supabase } = await requireErp();
  const month = String(form.get("month"));
  const rows: { sr_id: number; month: string; target: number; remark: string | null }[] = [];
  for (const [k, v] of form.entries()) {
    const m = /^target_(\d+)$/.exec(k);
    if (!m) continue;
    rows.push({ sr_id: Number(m[1]), month, target: Number(v) || 0, remark: String(form.get(`remark_${m[1]}`) ?? "").trim() || null });
  }
  const { error } = await supabase.from("erp_sr_targets").upsert(rows, { onConflict: "sr_id,month" });
  if (error) go("/erp/targets", error.message, false);
  revalidatePath("/erp", "layout");
  go(`/erp/targets`, "Targets saved.");
}

export async function saveAttendance(form: FormData) {
  const { supabase } = await requireErp();
  const date = String(form.get("date"));
  const rows: { staff_id: number; date: string; status: string; time_in: string | null; time_out: string | null }[] = [];
  for (const [k, v] of form.entries()) {
    const m = /^status_(\d+)$/.exec(k);
    if (!m || !v) continue;
    rows.push({ staff_id: Number(m[1]), date, status: String(v), time_in: (form.get(`in_${m[1]}`) as string) || null, time_out: (form.get(`out_${m[1]}`) as string) || null });
  }
  const { error } = await supabase.from("erp_attendance").upsert(rows, { onConflict: "staff_id,date" });
  if (error) go("/erp/staff/attendance", error.message, false);
  go(`/erp/staff/attendance`, `Attendance saved for ${rows.length} people.`);
}

export async function saveLeave(form: FormData) {
  const { supabase } = await requireErp();
  const row = { staff_id: Number(form.get("staff_id")), from_date: String(form.get("from_date")), to_date: String(form.get("to_date")), reason: String(form.get("reason") ?? "").trim() || null };
  if (!row.staff_id || !row.from_date || !row.to_date || row.to_date < row.from_date) go("/erp/staff/leave", "Pick a person and a valid date range.", false);
  const { error } = await supabase.from("erp_leaves").insert(row);
  if (error) go("/erp/staff/leave", error.message, false);
  go("/erp/staff/leave", "Leave recorded.");
}

/** Declare a month's salary: Salary Expense vs Salary Payable for that person (paid later from Payments → Staff). */
export async function declareSalary(form: FormData) {
  const { supabase } = await requireErp();
  const staffId = Number(form.get("staff_id"));
  const month = `${String(form.get("month")).slice(0, 7)}-01`;
  const amount = Number(form.get("amount"));
  const back = String(form.get("back") || "/erp/staff/salary");
  if (!staffId || !(amount > 0)) go(back, "Pick a person and an amount.", false);
  const { data: s } = await supabase.from("erp_staff").select("name").eq("id", staffId).maybeSingle();
  let breakdown: unknown = null;
  try {
    breakdown = form.get("breakdown") ? JSON.parse(String(form.get("breakdown"))) : null;
  } catch {
    breakdown = null;
  }
  const res = await post(supabase, salaryDeclarationPayload({ date: String(form.get("date")), staff_id: staffId, month, amount, breakdown, staffName: s?.name }));
  if (!res.ok) go(back, res.error.includes("duplicate") ? "Salary for this month is already declared." : res.error, false);
  revalidatePath("/erp", "layout");
  go(back, `${res.ok ? res.number : ""}: salary of ${amount.toFixed(2)} declared for ${s?.name}.`);
}

export async function saveReminder(form: FormData) {
  const { supabase } = await requireErp();
  const row = {
    remind_on: String(form.get("remind_on")),
    title: String(form.get("title") ?? "").trim(),
    retailer_id: Number(form.get("retailer_id")) || null,
    staff_id: Number(form.get("staff_id")) || null,
    amount: Number(form.get("amount")) || null,
    note: String(form.get("note") ?? "").trim() || null,
  };
  if (!row.title || !row.remind_on) go("/erp/reminders", "Enter a title and a date.", false);
  const { error } = await supabase.from("erp_reminders").insert(row);
  if (error) go("/erp/reminders", error.message, false);
  go("/erp/reminders", "Reminder saved.");
}

export async function toggleReminder(id: number, done: boolean) {
  const { supabase } = await requireErp();
  await supabase.from("erp_reminders").update({ done }).eq("id", id);
  revalidatePath("/erp/reminders");
}

/** Staff → DSR payroll policy: basic, daily allowance and incentive tiers (blank "to" = no upper limit). */
export async function savePayrollPolicy(form: FormData) {
  const { supabase } = await requireErp();
  const tiers: { min: number; max: number | null; rate: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const min = String(form.get(`min_${i}`) ?? "").trim();
    const rate = String(form.get(`rate_${i}`) ?? "").trim();
    if (!min || !rate) continue;
    const max = String(form.get(`max_${i}`) ?? "").trim();
    tiers.push({ min: Number(min), max: max ? Number(max) : null, rate: Number(rate) });
  }
  tiers.sort((a, b) => a.min - b.min);
  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    if (t.max !== null && t.max <= t.min) go("/erp/staff/policy", "Each tier's 'to' must be above its 'from'.", false);
    if (i > 0 && (tiers[i - 1].max ?? Infinity) > t.min) go("/erp/staff/policy", "Tiers overlap. Each tier must start where the previous one ends.", false);
  }
  const value = { basicSalary: Number(form.get("basicSalary")) || 0, dailyAllowance: Number(form.get("dailyAllowance")) || 0, tiers };
  const { error } = await supabase.from("erp_settings").upsert({ key: "payroll_policy", value });
  if (error) go("/erp/staff/policy", error.message, false);
  revalidatePath("/erp/staff", "layout");
  go("/erp/staff/policy", "Payroll policy saved.");
}
