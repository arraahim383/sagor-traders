import { notFound } from "next/navigation";
import { PrintButton } from "@/components/erp/PrintButton";
import { dateLabel, money } from "@/components/erp/ui";
import { requireErp } from "@/lib/erp/auth";

export const metadata = { title: "Payslip" };

type B = { sales?: number; workingDays?: number; allowance?: number; basic?: number; incentive?: number; mode?: string };

export default async function Payslip({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireErp();
  const { data: d } = await supabase.from("erp_salary_declarations").select("id, voucher_no, month, amount, breakdown, staff_id, staff:erp_staff(name, designation, kind, mobile)").eq("id", id).maybeSingle();
  if (!d) notFound();
  const staff = d.staff as unknown as { name: string; designation: string | null; kind: string; mobile: string | null };
  const end = new Date(`${d.month}T00:00:00Z`);
  end.setUTCMonth(end.getUTCMonth() + 1);
  end.setUTCDate(0);
  const [{ data: company }, { data: pays }] = await Promise.all([
    supabase.from("erp_settings").select("value").eq("key", "company").maybeSingle(),
    supabase.from("erp_payments").select("voucher_no, date, amount, mode").eq("party_type", "staff").eq("party_id", d.staff_id).gte("date", d.month).order("date"),
  ]);
  const c = (company?.value ?? {}) as { name?: string; address?: string; phone?: string };
  const b = (d.breakdown ?? {}) as B;
  const paid = (pays ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const monthName = new Date(`${d.month}T00:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const row = (label: string, value: string) => (
    <div className="flex justify-between border-b border-ink-900/10 py-2 text-sm"><span>{label}</span><span className="font-semibold tabular-nums">{value}</span></div>
  );
  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 flex justify-end print:hidden"><PrintButton label="Print payslip" /></div>
      <section className="rounded-2xl bg-white p-8 shadow-card print:shadow-none">
        <div className="text-center">
          <h1 className="text-xl font-extrabold text-forest-900">{c.name ?? "M/S Sagor Traders"}</h1>
          <p className="text-xs text-ink-600">{c.address}{c.phone ? ` · ${c.phone}` : ""}</p>
          <p className="mt-3 text-sm font-bold uppercase tracking-[0.2em] text-leaf-600">Payslip · {monthName}</p>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2 text-sm">
          <p><span className="text-ink-600">Name:</span> <b>{staff.name}</b></p>
          <p className="text-right"><span className="text-ink-600">Voucher:</span> <b>{d.voucher_no}</b></p>
          <p><span className="text-ink-600">Designation:</span> {staff.designation ?? staff.kind.toUpperCase()}</p>
          <p className="text-right"><span className="text-ink-600">Mobile:</span> {staff.mobile ?? "—"}</p>
        </div>
        <div className="mt-6">
          {b.basic !== undefined && row("Basic salary", money(b.basic))}
          {b.allowance !== undefined && row(`Daily allowance (${b.workingDays ?? 0} days)`, money(b.allowance))}
          {b.incentive !== undefined && row(`Incentive on sales of ${money(b.sales ?? 0, 0)} (${b.mode ?? "slab"})`, money(b.incentive))}
          {row("Salary declared", money(d.amount))}
          {row("Paid", money(paid))}
          <div className="flex justify-between py-3 text-base font-extrabold"><span>Balance</span><span className="tabular-nums">{money(Number(d.amount) - paid)}</span></div>
        </div>
        {(pays ?? []).length > 0 && (
          <div className="mt-2 text-xs text-ink-600">Payments: {(pays ?? []).map((p) => `${p.voucher_no} ${dateLabel(p.date)} ${money(p.amount)}${p.mode ? ` (${p.mode})` : ""}`).join(" · ")}</div>
        )}
        <div className="mt-14 grid grid-cols-2 gap-10 text-center text-xs text-ink-600">
          <p className="border-t border-ink-900/30 pt-2">Employee signature</p>
          <p className="border-t border-ink-900/30 pt-2">Authorised signature</p>
        </div>
      </section>
    </div>
  );
}
