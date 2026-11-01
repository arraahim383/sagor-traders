import Link from "next/link";
import { requireErp } from "@/lib/erp/auth";
import { selectAll } from "@/lib/erp/data";
import { BUSINESS_NAV, canOpen } from "@/lib/erp/nav";
import { Card, Notice, PageHeader, Stat, money, monthStart, today } from "@/components/erp/ui";

export const metadata = { title: "Dashboard" };

const sum = (rows: { [k: string]: unknown }[] | null, k: string) => (rows ?? []).reduce((s, r) => s + Number(r[k] ?? 0), 0);

export default async function BusinessDashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const { denied } = await searchParams;
  const { supabase } = await requireErp();
  const d = today();
  const from = monthStart(d);
  const [month, todays, accounts, parties, low, targets, achieved, { data: mods }] = await Promise.all([
    supabase.rpc("erp_rpt_sales_orders", { p_from: from, p_to: d, p_by: "all" }),
    supabase.rpc("erp_rpt_sales_orders", { p_from: d, p_to: d, p_by: "all" }),
    supabase.from("erp_account_balances").select("code, name, is_cash, balance").order("code"),
    selectAll<{ party_type: string; party_id: number; balance: number }>((a, b) => supabase.from("erp_party_balances").select("party_type, party_id, balance").order("party_type").order("party_id").range(a, b)),
    supabase.from("erp_stock_list").select("name, stock, min_stock").eq("active", true),
    supabase.from("erp_sr_targets").select("sr_id, target, sr:erp_staff(name)").eq("month", from),
    supabase.rpc("erp_rpt_sales_orders", { p_from: from, p_to: d, p_by: "sr" }),
    supabase.rpc("erp_my_modules"),
  ]);
  const modules = (mods as string[] | null) ?? null;
  const cash = (accounts.data ?? []).filter((a) => a.is_cash);
  const partyTotal = (t: string) => parties.filter((p) => p.party_type === t).reduce((s, p) => s + Number(p.balance), 0);
  const lowStock = (low.data ?? []).filter((r) => Number(r.stock) <= Number(r.min_stock));
  const ach = new Map<number, number>();
  for (const o of (achieved.data ?? []) as { key: string | null; total: number }[]) if (o.key) ach.set(Number(o.key), Number(o.total));
  const monthName = new Date(`${from}T00:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader eyebrow="M/S Sagor Traders" title="Business dashboard" />
      {denied && <Notice tone="error">Your role can&apos;t open {BUSINESS_NAV.find((g) => g.key === denied)?.label ?? "that page"}. Ask an administrator if you need it.</Notice>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={`Sales · ${monthName}`} value={money(sum(month.data, "total"), 0)} tone="dark" />
        <Stat label="Due sales this month" value={money(sum(month.data, "payable") - sum(month.data, "paid"), 0)} tone="red" />
        <Stat label="Sales today" value={money(sum(todays.data, "total"), 0)} />
        <Stat label="Cash & bank balance" value={money(cash.reduce((s, a) => s + Number(a.balance), 0), 0)} tone="green" />
        <Stat label="Supplier dues" value={money(-partyTotal("supplier"), 0)} />
        <Stat label="Retailer dues" value={money(partyTotal("retailer"), 0)} />
        <Stat label="SR balance" value={money(partyTotal("sr"), 0)} />
        <Stat label="DSR balance" value={money(partyTotal("dsr"), 0)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Accounts" className="lg:col-span-1">
          <ul className="divide-y divide-ink-900/5 text-sm">
            {cash.map((a) => (
              <li key={a.code} className="flex justify-between py-2"><span>{a.name}</span><span className="font-bold tabular-nums">{money(a.balance)}</span></li>
            ))}
          </ul>
        </Card>
        <Card title={`SR target vs achievement · ${monthName}`} className="lg:col-span-2" action={<Link href="/erp/targets" className="text-sm font-bold text-forest-700">Targets</Link>}>
          {(targets.data ?? []).length === 0 && ach.size === 0 ? (
            <p className="text-sm text-ink-600">No targets set for this month yet.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {((targets.data ?? []) as unknown as { sr_id: number; target: number; sr: { name: string } }[]).map((t) => {
                const a = ach.get(Number(t.sr_id)) ?? 0;
                const pct = t.target > 0 ? Math.min(100, (a / t.target) * 100) : 0;
                return (
                  <li key={t.sr_id}>
                    <div className="flex justify-between font-semibold"><span>{t.sr.name}</span><span className="tabular-nums">{money(a, 0)} / {money(t.target, 0)}</span></div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-mint-50"><div className="h-full rounded-full bg-leaf-500" style={{ width: `${pct}%` }} /></div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {lowStock.length > 0 && (
        <Card title={`Low stock (${lowStock.length})`} className="mt-6" action={<Link href="/erp/reports/low-stock" className="text-sm font-bold text-forest-700">See all</Link>}>
          <p className="text-sm text-ink-600">{lowStock.slice(0, 12).map((r) => `${r.name} (${Number(r.stock)})`).join(" · ")}</p>
        </Card>
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {BUSINESS_NAV.filter((g) => g.key !== "home" && canOpen(modules, g.key)).map((g) => (
          <Card key={g.key} title={g.label}>
            <ul className="space-y-1 text-sm">
              {g.links.map((l) => <li key={l.href}><Link href={l.href} className="font-semibold text-forest-700 hover:underline">{l.label}</Link></li>)}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
