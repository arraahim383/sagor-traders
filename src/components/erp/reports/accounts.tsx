import Link from "next/link";
import { Card, DataTable, Notice, Stat, dateLabel, money } from "@/components/erp/ui";
import { selectAll } from "@/lib/erp/data";
import { n, rows, total, type Ctx } from "./shared";

type Acc = { id: number; code: string; name: string; type: string; is_cash: boolean; opening: number; debit: number; credit: number };
type Exp = { id: number; voucher_no: string; date: string; description: string | null; ref_no: string | null; amount: number; category: { name: string } | null; account: { name: string } };

export const ACCOUNT_KEYS = ["trial-balance", "profit-loss", "balance-sheet", "expense-report", "day-book"];

const closing = (a: Acc) => n(a.opening) + n(a.debit) - n(a.credit);
const ledger = (a: Acc, from: string, to: string) => (
  <Link href={`/erp/accounts/ledger?account=${a.id}&from=${from}&to=${to}`} className="font-semibold text-forest-800 hover:underline">{a.name}</Link>
);
const accounts = async (c: Ctx, from: string, to: string) => rows<Acc>(await c.supabase.rpc("erp_rpt_accounts", { p_from: from, p_to: to }));

export async function AccountsReport(c: Ctx) {
  switch (c.key) {
    case "trial-balance": return TrialBalance(c);
    case "profit-loss": return ProfitLoss(c);
    case "balance-sheet": return BalanceSheet(c);
    case "expense-report": return Expenses(c);
    default: return DayBook(c);
  }
}

async function TrialBalance(c: Ctx) {
  const data = (await accounts(c, c.from, c.to)).filter((a) => n(a.opening) || n(a.debit) || n(a.credit));
  const dr = total(data, (a) => Math.max(0, closing(a)));
  const cr = total(data, (a) => Math.max(0, -closing(a)));
  return (
    <div className="space-y-4">
      {Math.abs(dr - cr) > 0.005 && <Notice tone="error">Out of balance by {money(Math.abs(dr - cr))}.</Notice>}
      <DataTable
        rows={data}
        empty="No entries yet."
        cols={[
          { label: "Code", get: (a) => a.code },
          { label: "Account", get: (a) => ledger(a, c.from, c.to) },
          { label: "Opening", right: true, get: (a) => money(a.opening) },
          { label: "Period debit", right: true, get: (a) => money(a.debit) },
          { label: "Period credit", right: true, get: (a) => money(a.credit) },
          { label: "Debit", right: true, get: (a) => (closing(a) > 0.005 ? money(closing(a)) : "") },
          { label: "Credit", right: true, get: (a) => (closing(a) < -0.005 ? money(-closing(a)) : "") },
        ]}
        foot={["", "Total", "", money(total(data, (a) => n(a.debit))), money(total(data, (a) => n(a.credit))), money(dr), money(cr)]}
      />
      <p className="text-xs text-ink-400">Closing balances as of {dateLabel(c.to)}. Opening = everything before {dateLabel(c.from)}.</p>
    </div>
  );
}

function Section({ title, list, amount, from, to }: { title: string; list: Acc[]; amount: (a: Acc) => number; from: string; to: string }) {
  const shown = list.filter((a) => Math.abs(amount(a)) > 0.005);
  return (
    <Card title={title}>
      <table className="w-full text-sm">
        <tbody className="divide-y divide-ink-900/5">
          {shown.length === 0 && <tr><td className="py-2 text-ink-400">Nothing</td></tr>}
          {shown.map((a) => (
            <tr key={a.id}><td className="py-2">{a.code} · {ledger(a, from, to)}</td><td className="py-2 text-right tabular-nums">{money(amount(a))}</td></tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-forest-900/10 font-extrabold">
          <tr><td className="py-2">Total {title.toLowerCase()}</td><td className="py-2 text-right tabular-nums">{money(total(shown, amount))}</td></tr>
        </tfoot>
      </table>
    </Card>
  );
}

async function ProfitLoss(c: Ctx) {
  const data = await accounts(c, c.from, c.to);
  const inc = (a: Acc) => n(a.credit) - n(a.debit);
  const exp = (a: Acc) => n(a.debit) - n(a.credit);
  const income = data.filter((a) => a.type === "income");
  const expense = data.filter((a) => a.type === "expense");
  const byKey = (code: string) => data.find((a) => a.code === code);
  const sales = byKey("4000") ? inc(byKey("4000")!) : 0;
  const cogs = byKey("5000") ? exp(byKey("5000")!) : 0;
  const net = total(income, inc) - total(expense, exp);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Sales revenue" value={money(sales)} />
        <Stat label="Cost of goods sold" value={money(cogs)} />
        <Stat label="Gross profit" value={money(sales - cogs)} tone="green" />
        <Stat label={net >= 0 ? "Net profit" : "Net loss"} value={money(Math.abs(net))} tone={net >= 0 ? "dark" : "red"} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Income" list={income} amount={inc} from={c.from} to={c.to} />
        <Section title="Expenses" list={expense} amount={exp} from={c.from} to={c.to} />
      </div>
    </div>
  );
}

async function BalanceSheet(c: Ctx) {
  const data = await accounts(c, "1900-01-01", c.to);
  const asset = (a: Acc) => closing(a);
  const claim = (a: Acc) => -closing(a);
  const assets = data.filter((a) => a.type === "asset");
  const liabilities = data.filter((a) => a.type === "liability");
  const equity = data.filter((a) => a.type === "equity");
  const profit = total(data.filter((a) => a.type === "income" || a.type === "expense"), claim);
  const left = total(assets, asset);
  const right = total(liabilities, claim) + total(equity, claim) + profit;
  const ok = Math.abs(left - right) < 0.005;
  return (
    <div className="space-y-5">
      <Notice tone={ok ? "ok" : "error"}>{ok ? `Balanced: assets ${money(left)} = liabilities + equity ${money(right)}.` : `Not balanced: assets ${money(left)} vs ${money(right)}.`}</Notice>
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Assets" list={assets} amount={asset} from="1900-01-01" to={c.to} />
        <div className="space-y-5">
          <Section title="Liabilities" list={liabilities} amount={claim} from="1900-01-01" to={c.to} />
          <Section title="Equity" list={equity} amount={claim} from="1900-01-01" to={c.to} />
          <Card>
            <div className="flex justify-between text-sm font-extrabold"><span>{profit >= 0 ? "Current profit" : "Current loss"} (not yet closed)</span><span className="tabular-nums">{money(profit)}</span></div>
            <div className="mt-2 flex justify-between border-t-2 border-forest-900/10 pt-2 text-sm font-extrabold"><span>Liabilities + equity</span><span className="tabular-nums">{money(right)}</span></div>
          </Card>
        </div>
      </div>
    </div>
  );
}

async function Expenses(c: Ctx) {
  const [entries, cats, accs] = await Promise.all([
    selectAll<Exp>((a, b) =>
      c.supabase
        .from("erp_cash_entries")
        .select("id, voucher_no, date, description, ref_no, amount, category:erp_cash_categories(name), account:erp_accounts!erp_cash_entries_account_id_fkey(name)")
        .eq("kind", "payment")
        .gte("date", c.from)
        .lte("date", c.to)
        .order("date")
        .order("id")
        .range(a, b) as never,
    ),
    c.supabase.rpc("erp_rpt_expense_categories", { p_from: c.from, p_to: c.to }),
    accounts(c, c.from, c.to),
  ]);
  const byCat = rows<{ category: string; entries: number; amount: number }>(cats);
  const expAcc = accs.filter((a) => a.type === "expense" && Math.abs(n(a.debit) - n(a.credit)) > 0.005);
  return (
    <div className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Cash book expenses by category">
          <DataTable rows={byCat} empty="No cash book expenses." cols={[{ label: "Category", get: (r) => r.category }, { label: "Entries", right: true, get: (r) => r.entries }, { label: "Amount", right: true, get: (r) => money(r.amount) }]} foot={["Total", total(byCat, (r) => n(r.entries)), money(total(byCat, (r) => n(r.amount)))]} />
        </Card>
        <Card title="All expense accounts (from the books)">
          <DataTable rows={expAcc} empty="No expenses booked." cols={[{ label: "Account", get: (a) => ledger(a, c.from, c.to) }, { label: "Amount", right: true, get: (a) => money(n(a.debit) - n(a.credit)) }]} foot={["Total", money(total(expAcc, (a) => n(a.debit) - n(a.credit)))]} />
        </Card>
      </div>
      <DataTable
        rows={entries}
        empty="No cash book expenses in this period."
        cols={[
          { label: "Date", get: (e) => dateLabel(e.date) },
          { label: "Voucher", get: (e) => <b>{e.voucher_no}</b> },
          { label: "Category", get: (e) => e.category?.name ?? "—" },
          { label: "Description", get: (e) => e.description ?? "—" },
          { label: "Account", get: (e) => e.account.name },
          { label: "Amount", right: true, get: (e) => money(e.amount) },
        ]}
        foot={["Total", "", "", "", "", money(total(entries, (e) => n(e.amount)))]}
      />
    </div>
  );
}

type DayOrder = { id: number; invoice_no: string; total: number; payable: number; paid: number; retailer: { code: string; name: string } | null; sr: { name: string } | null; dsr: { name: string } | null };
type DayPay = { id: number; voucher_no: string; party_type: string; direction: string; amount: number; less: number; mode: string | null; remark: string | null; account: { name: string } | null };
type DayCash = { id: number; voucher_no: string; kind: string; description: string | null; amount: number; direction: string | null; category: { name: string } | null; account: { name: string } };

async function DayBook(c: Ctx) {
  const d = c.to;
  const [ordersRes, accs, cats, paysRes, cashRes] = await Promise.all([
    c.supabase.from("erp_sales_orders").select("id, invoice_no, total, payable, paid, retailer:erp_retailers(code, name), sr:erp_staff!erp_sales_orders_sr_id_fkey(name), dsr:erp_staff!erp_sales_orders_dsr_id_fkey(name)").eq("status", "finalized").eq("date", d).order("id"),
    accounts(c, d, d),
    c.supabase.rpc("erp_rpt_expense_categories", { p_from: d, p_to: d }),
    c.supabase.from("erp_payments").select("id, voucher_no, party_type, direction, amount, less, mode, remark, account:erp_accounts(name)").eq("date", d).order("id"),
    c.supabase.from("erp_cash_entries").select("id, voucher_no, kind, description, amount, direction, category:erp_cash_categories(name), account:erp_accounts!erp_cash_entries_account_id_fkey(name)").eq("date", d).order("id"),
  ]);
  const orders = rows<DayOrder>(ordersRes);
  const cash = accs.filter((a) => a.is_cash);
  const byCat = rows<{ category: string; entries: number; amount: number }>(cats);
  const pays = rows<DayPay>(paysRes);
  const entries = rows<DayCash>(cashRes);
  const f = (k: "total" | "payable" | "paid") => total(orders, (o) => n(o[k]));
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Invoices" value={String(orders.length)} />
        <Stat label="Total sales" value={money(f("total"))} tone="dark" />
        <Stat label="Paid at sale" value={money(f("paid"))} tone="green" />
        <Stat label="Due created" value={money(f("payable") - f("paid"))} tone="red" />
      </div>
      <Card title="Cash & bank">
        <DataTable
          rows={cash}
          cols={[
            { label: "Account", get: (a) => ledger(a, d, d) },
            { label: "Opening", right: true, get: (a) => money(a.opening) },
            { label: "Received", right: true, get: (a) => money(a.debit) },
            { label: "Paid", right: true, get: (a) => money(a.credit) },
            { label: "Closing", right: true, get: (a) => <b>{money(closing(a))}</b> },
          ]}
          foot={["Total", money(total(cash, (a) => n(a.opening))), money(total(cash, (a) => n(a.debit))), money(total(cash, (a) => n(a.credit))), money(total(cash, closing))]}
        />
      </Card>
      <Card title="Sales">
        <DataTable
          rows={orders}
          empty="No invoices finalized on this day."
          cols={[
            { label: "Invoice", get: (o) => <Link href={`/erp/sales/${o.id}`} className="font-bold text-forest-800 hover:underline">{o.invoice_no}</Link> },
            { label: "Party", get: (o) => (o.retailer ? `${o.retailer.code} - ${o.retailer.name}` : o.sr ? `SR ${o.sr.name}` : o.dsr ? `DSR ${o.dsr.name}` : "—") },
            { label: "Total", right: true, get: (o) => money(o.total) },
            { label: "Payable", right: true, get: (o) => money(o.payable) },
            { label: "Paid", right: true, get: (o) => money(o.paid) },
            { label: "Due", right: true, get: (o) => money(n(o.payable) - n(o.paid)) },
          ]}
          foot={["Total", "", money(f("total")), money(f("payable")), money(f("paid")), money(f("payable") - f("paid"))]}
        />
      </Card>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Receipts & payments">
          <DataTable
            rows={pays}
            empty="None."
            cols={[
              { label: "Voucher", get: (p) => <b>{p.voucher_no}</b> },
              { label: "Party", get: (p) => p.party_type.toUpperCase() },
              { label: "Account", get: (p) => p.account?.name ?? p.mode ?? "—" },
              { label: "In", right: true, get: (p) => (p.direction === "in" ? money(p.amount) : "") },
              { label: "Out", right: true, get: (p) => (p.direction === "out" ? money(p.amount) : "") },
            ]}
          />
        </Card>
        <Card title="Expenses by category">
          <DataTable rows={byCat} empty="None." cols={[{ label: "Category", get: (r) => r.category }, { label: "Amount", right: true, get: (r) => money(r.amount) }]} foot={["Total", money(total(byCat, (r) => n(r.amount)))]} />
        </Card>
      </div>
      <Card title="Cash book entries">
        <DataTable
          rows={entries}
          empty="None."
          cols={[
            { label: "Voucher", get: (e) => <b>{e.voucher_no}</b> },
            { label: "Type", get: (e) => e.kind + (e.direction ? ` (${e.direction})` : "") },
            { label: "Category", get: (e) => e.category?.name ?? "—" },
            { label: "Description", get: (e) => e.description ?? "—" },
            { label: "Account", get: (e) => e.account.name },
            { label: "Amount", right: true, get: (e) => money(e.amount) },
          ]}
        />
      </Card>
    </div>
  );
}
