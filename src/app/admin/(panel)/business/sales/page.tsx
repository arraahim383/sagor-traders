import Link from "next/link";
import { Plus } from "lucide-react";
import { requireStaff } from "@/lib/admin/auth";
import { taka } from "@/lib/erp/money";

export const metadata = { title: "Sales" };
export const dynamic = "force-dynamic";

type Row = {
  id: number;
  invoice_no: string;
  date: string;
  type: string;
  status: string;
  total: number;
  payable: number;
  paid: number;
  cost: number;
  sr: { name: string } | null;
  dsr: { name: string } | null;
  retailer: { code: string; name: string } | null;
};

const TYPE = { dsr: "DSR Sales", direct: "Direct", return: "Return" } as Record<string, string>;

export default async function SalesListPage() {
  const { supabase } = await requireStaff();
  const [{ data }, { data: accounts }] = await Promise.all([
    supabase
      .from("erp_sales_orders")
      .select("id, invoice_no, date, type, status, total, payable, paid, cost, sr:erp_staff!erp_sales_orders_sr_id_fkey(name), dsr:erp_staff!erp_sales_orders_dsr_id_fkey(name), retailer:erp_retailers(code, name)")
      .order("id", { ascending: false })
      .limit(200),
    supabase.from("erp_account_balances").select("code, name, type, balance").neq("balance", 0).order("code"),
  ]);
  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-leaf-600">Sales &amp; Order</p>
          <h1 className="text-3xl font-extrabold tracking-[-0.02em] text-forest-900">Sales</h1>
        </div>
        <Link href="/admin/business/sales/new" className="btn-forest inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold">
          <Plus className="size-4" /> New sales order
        </Link>
      </div>

      <section className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-mint-50 text-left text-[11px] font-bold uppercase tracking-wider text-ink-600">
            <tr>
              {["Invoice", "Date", "Type", "Party", "Total", "Payable", "Paid", "Due", "Status"].map((h, i) => (
                <th key={h} className={`px-4 py-3 ${i >= 4 && i <= 7 ? "text-right" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-900/5">
            {rows.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-ink-600">No sales yet. Numbering starts fresh at INV-2026-00001.</td></tr>
            )}
            {rows.map((r) => {
              const due = Number(r.payable) - Number(r.paid);
              return (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-bold text-forest-800"><Link href={`/admin/business/sales/${r.id}`} className="hover:underline">{r.invoice_no}</Link></td>
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(`${r.date}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                  <td className="px-4 py-3">{TYPE[r.type] ?? r.type}</td>
                  <td className="px-4 py-3">{r.retailer ? `${r.retailer.code} - ${r.retailer.name}` : r.sr?.name ?? r.dsr?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{taka(Number(r.total))}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{taka(Number(r.payable))}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{taka(Number(r.paid))}</td>
                  <td className={`px-4 py-3 text-right font-bold tabular-nums ${due > 0.005 ? "text-red-600" : "text-forest-700"}`}>{taka(due)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${r.status === "finalized" ? "bg-lime-200 text-forest-950" : "bg-ink-900/5 text-ink-600"}`}>{r.status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="mt-8 rounded-2xl bg-white p-6 shadow-card">
        <h2 className="text-lg font-extrabold">Account balances</h2>
        <p className="text-sm text-ink-600">Debit positive, credit negative. Every posting is checked to balance before it&apos;s saved.</p>
        <ul className="mt-4 divide-y divide-ink-900/5 text-sm">
          {(accounts ?? []).map((a) => (
            <li key={a.code} className="flex justify-between py-2">
              <span><span className="text-ink-400">{a.code}</span> {a.name}</span>
              <span className="font-bold tabular-nums">{taka(Number(a.balance))}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
