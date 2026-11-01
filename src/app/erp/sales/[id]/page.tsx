import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { PrintButton } from "@/components/erp/PrintButton";
import { Badge, ButtonLink, Card, dateLabel, money, qty } from "@/components/erp/ui";
import { requireErp } from "@/lib/erp/auth";

type Line = { id: number; carton: number; piece: number; return_qty: number; damage_qty: number; free_qty: number; sold_qty: number; price: number; subtotal: number; cost: number; is_free: boolean; product: { name: string; name_bn: string | null; per: number } };

export default async function SalesInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireErp();
  const { data: o } = await supabase
    .from("erp_sales_orders")
    .select("*, sr:erp_staff!erp_sales_orders_sr_id_fkey(name, mobile), dsr:erp_staff!erp_sales_orders_dsr_id_fkey(name, mobile), retailer:erp_retailers(code, name, name_bn, mobile, address, route:erp_routes(name)), lines:erp_sales_lines(*, product:erp_products(name, name_bn, per)), payments:erp_sale_payments(amount, account:erp_accounts(name))")
    .eq("id", id)
    .maybeSingle();
  if (!o) notFound();
  const { data: company } = await supabase.from("erp_settings").select("value").eq("key", "company").maybeSingle();
  const c = (company?.value ?? {}) as { name?: string; address?: string; phone?: string; receipt_footer?: string };
  const journal = o.journal_id
    ? (await supabase.from("erp_journal_lines").select("debit, credit, account:erp_accounts(code, name)").eq("journal_id", o.journal_id).order("id")).data ?? []
    : [];
  const lines = (o.lines as Line[]).sort((a, b) => a.id - b.id);
  const due = Number(o.payable) - Number(o.paid);
  const t = (k: string) => Number(o[k] ?? 0);
  const party = o.retailer ? `${o.retailer.code} - ${o.retailer.name}` : o.sr?.name ?? o.dsr?.name ?? "—";

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-extrabold tracking-[-0.02em] text-forest-900">{o.invoice_no}</h1>
          <Badge tone={o.status === "finalized" ? "lime" : "grey"}>{o.status}</Badge>
        </div>
        <div className="flex gap-2">
          {o.status === "draft" && <ButtonLink href={`/erp/sales/${o.id}/edit`}><Pencil className="size-4" /> Edit / finalize</ButtonLink>}
          <ButtonLink href={`/erp/sales/${o.id}/receipt`} variant="outline">SR receipt (Bangla)</ButtonLink>
          <PrintButton label="Print invoice" />
        </div>
      </div>

      <section className="rounded-2xl bg-white p-6 shadow-card print:p-0 print:shadow-none">
        <div className="flex flex-wrap justify-between gap-4 border-b border-ink-900/10 pb-4">
          <div>
            <p className="text-xl font-extrabold text-forest-900">{c.name ?? "M/S Sagor Traders"}</p>
            <p className="text-sm text-ink-600">{c.address} · {c.phone}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-bold">SALES INVOICE</p>
            <p>{o.invoice_no}</p>
            <p>{dateLabel(o.date)}</p>
          </div>
        </div>
        <div className="grid gap-2 py-4 text-sm sm:grid-cols-2">
          <p><span className="text-ink-400">Party:</span> <b>{party}</b>{o.retailer?.name_bn ? ` (${o.retailer.name_bn})` : ""}</p>
          {o.retailer?.route?.name && <p><span className="text-ink-400">Route:</span> {o.retailer.route.name}</p>}
          {o.sr && <p><span className="text-ink-400">SR:</span> {o.sr.name}</p>}
          {o.dsr && <p><span className="text-ink-400">DSR:</span> {o.dsr.name}</p>}
          {o.retailer?.mobile && <p><span className="text-ink-400">Phone:</span> {o.retailer.mobile}</p>}
          {o.retailer?.address && <p><span className="text-ink-400">Address:</span> {o.retailer.address}</p>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y border-ink-900/10 text-left text-[11px] font-bold uppercase tracking-wider text-ink-600">
              <tr>
                {["#", "Description", "Carton", "Piece", "Order qty", "Return", "Damage", "Sold", "Free", "Price", "Sub total"].map((h, i) => (
                  <th key={h} className={`px-2 py-2 ${i >= 2 ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-900/5">
              {lines.map((l, i) => (
                <tr key={l.id}>
                  <td className="px-2 py-2">{i + 1}</td>
                  <td className="px-2 py-2 font-semibold">{l.product.name}{l.is_free && <span className="ml-1 text-xs text-leaf-600">FREE</span>}</td>
                  <td className="px-2 py-2 text-right">{l.carton}</td>
                  <td className="px-2 py-2 text-right">{l.piece}</td>
                  <td className="px-2 py-2 text-right">{qty(l.carton * l.product.per + l.piece + (l.is_free ? 0 : Number(l.free_qty)))}</td>
                  <td className="px-2 py-2 text-right">{l.return_qty}</td>
                  <td className="px-2 py-2 text-right">{l.damage_qty}</td>
                  <td className="px-2 py-2 text-right">{qty(l.sold_qty)}</td>
                  <td className="px-2 py-2 text-right">{qty(l.free_qty)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{Number(l.price).toFixed(4)}</td>
                  <td className="px-2 py-2 text-right font-bold tabular-nums">{money(l.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="ml-auto mt-4 max-w-xs space-y-1 text-sm">
          {[["Total", t("total")], ["Commission", -t("commission")], ["Cash claim", -t("cash_claim")], ["Cash damage", -t("cash_damage")], ["Transport", -t("transport")], ["DSR cost", -t("dsr_cost")], ["Discount", -t("discount")]]
            .filter(([k, v]) => k === "Total" || v !== 0)
            .map(([k, v]) => <p key={k as string} className="flex justify-between"><span>{k}</span><span className="tabular-nums">{money(v as number)}</span></p>)}
          <p className="flex justify-between border-t border-ink-900/10 pt-1 font-extrabold"><span>Payable</span><span className="tabular-nums">{money(o.payable)}</span></p>
          <p className="flex justify-between"><span>Paid</span><span className="tabular-nums">{money(o.paid)}</span></p>
          <p className={`flex justify-between font-extrabold ${due > 0.005 ? "text-red-600" : "text-forest-700"}`}><span>{due < -0.005 ? "Receive" : "Due"}</span><span className="tabular-nums">{money(Math.abs(due))}</span></p>
        </div>
        {o.remark && <p className="mt-4 text-sm"><span className="text-ink-400">Remark:</span> {o.remark}</p>}
        <div className="mt-12 hidden justify-between text-sm print:flex">
          <span>DSR / SR signature</span>
          <span>Authorised signature</span>
        </div>
        {c.receipt_footer && <p className="mt-6 text-center text-sm text-ink-600">{c.receipt_footer}</p>}
      </section>

      {journal.length > 0 && (
        <Card title="Books entry" className="mt-6 print:hidden">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-ink-900/5">
              {(journal as unknown as { debit: number; credit: number; account: { code: string; name: string } }[]).map((j, i) => (
                <tr key={i}>
                  <td className="py-2"><span className="text-ink-400">{j.account.code}</span> {j.account.name}</td>
                  <td className="py-2 text-right tabular-nums">{Number(j.debit) ? money(j.debit) : ""}</td>
                  <td className="py-2 text-right tabular-nums">{Number(j.credit) ? money(j.credit) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-ink-400">Cost of goods {money(o.cost)} · gross profit {money(Number(o.total) - Number(o.cost))}</p>
        </Card>
      )}
    </div>
  );
}
