import { DataTable, money } from "@/components/erp/ui";
import { partyBalances } from "@/lib/erp/data";
import { n, rows, total, type Ctx } from "./shared";

type Person = { id: number; name: string; kind: string; designation: string | null; salary: number };

export const STAFF_KEYS = ["salary-sheet", "attendance-sheet"];

export async function StaffReport(c: Ctx) {
  const people = rows<Person>(await c.supabase.from("erp_staff").select("id, name, kind, designation, salary").eq("active", true).order("name"));
  if (c.key === "salary-sheet") {
    const [decl, pays, owed] = await Promise.all([
      c.supabase.from("erp_salary_declarations").select("staff_id, voucher_no, amount").eq("month", c.month),
      c.supabase.from("erp_payments").select("party_id, amount").eq("party_type", "staff").gte("date", c.month).lte("date", c.monthEnd),
      partyBalances(c.supabase, "staff"),
    ]);
    const d = rows<{ staff_id: number; voucher_no: string; amount: number }>(decl);
    const p = rows<{ party_id: number; amount: number }>(pays);
    const data = people.map((s) => ({
      ...s,
      voucher: d.find((x) => x.staff_id === s.id)?.voucher_no,
      declared: total(d.filter((x) => x.staff_id === s.id), (x) => n(x.amount)),
      paid: total(p.filter((x) => x.party_id === s.id), (x) => n(x.amount)),
      outstanding: -(owed.get(s.id) ?? 0),
    }));
    return (
      <DataTable
        rows={data}
        cols={[
          { label: "Name", get: (r) => <b>{r.name}</b> },
          { label: "Designation", get: (r) => r.designation ?? r.kind.toUpperCase() },
          { label: "Basic", right: true, get: (r) => money(r.salary, 0) },
          { label: "Declared", right: true, get: (r) => (r.voucher ? money(r.declared) : <span className="text-ink-400">not declared</span>) },
          { label: "Paid this month", right: true, get: (r) => money(r.paid) },
          { label: "Outstanding (all months)", right: true, get: (r) => <b className={r.outstanding > 0.005 ? "text-red-600" : ""}>{money(r.outstanding)}</b> },
          { label: "Signature", get: () => <span className="inline-block w-28 border-b border-ink-900/30">&nbsp;</span> },
        ]}
        foot={["Total", "", money(total(data, (r) => n(r.salary)), 0), money(total(data, (r) => r.declared)), money(total(data, (r) => r.paid)), money(total(data, (r) => r.outstanding)), ""]}
      />
    );
  }
  const att = rows<{ staff_id: number; status: string }>(
    await c.supabase.from("erp_attendance").select("staff_id, status").gte("date", c.month).lte("date", c.monthEnd).limit(5000),
  );
  const count = (id: number, st: string) => att.filter((a) => a.staff_id === id && a.status === st).length;
  const data = people.map((s) => ({ ...s, present: count(s.id, "present"), late: count(s.id, "late"), absent: count(s.id, "absent"), leave: count(s.id, "leave") }));
  return (
    <DataTable
      rows={data}
      cols={[
        { label: "Name", get: (r) => <b>{r.name}</b> },
        { label: "Role", get: (r) => r.designation ?? r.kind.toUpperCase() },
        { label: "Present", right: true, get: (r) => r.present },
        { label: "Late", right: true, get: (r) => r.late },
        { label: "Absent", right: true, get: (r) => r.absent },
        { label: "Leave", right: true, get: (r) => r.leave },
        { label: "Working days", right: true, get: (r) => <b>{r.present + r.late}</b> },
      ]}
    />
  );
}
