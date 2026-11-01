import { notFound } from "next/navigation";
import { PrintButton } from "@/components/erp/PrintButton";
import { requireErp } from "@/lib/erp/auth";

export const metadata = { title: "SR receipt" };

type Line = { id: number; carton: number; piece: number; free_qty: number; sold_qty: number; price: number; subtotal: number; is_free: boolean; product: { name: string; name_bn: string | null; per: number } };

const bn = (n: number, dp = 2) => Number(n).toLocaleString("bn-BD", { minimumFractionDigits: dp, maximumFractionDigits: dp });
const bnInt = (n: number) => Number(n).toLocaleString("bn-BD", { maximumFractionDigits: 3 });

/** Rushda's 10 cm SR receipt, in Bangla, for the shop. */
export default async function SrReceipt({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireErp();
  const [{ data: o }, { data: company }] = await Promise.all([
    supabase
      .from("erp_sales_orders")
      .select("invoice_no, date, total, payable, paid, commission, cash_claim, cash_damage, transport, dsr_cost, discount, sr:erp_staff!erp_sales_orders_sr_id_fkey(name, mobile), dsr:erp_staff!erp_sales_orders_dsr_id_fkey(name), retailer:erp_retailers(name, name_bn, mobile, address, route:erp_routes(name)), lines:erp_sales_lines(id, carton, piece, free_qty, sold_qty, price, subtotal, is_free, product:erp_products(name, name_bn, per))")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("erp_settings").select("value").eq("key", "company").maybeSingle(),
  ]);
  if (!o) notFound();
  const c = (company?.value ?? {}) as { name?: string; address?: string; phone?: string; receipt_footer?: string };
  const r = o.retailer as unknown as { name: string; name_bn: string | null; mobile: string | null; address: string | null; route: { name: string } | null } | null;
  const sr = o.sr as unknown as { name: string; mobile: string | null } | null;
  const lines = (o.lines as unknown as Line[]).sort((a, b) => a.id - b.id);
  const deductions = ["commission", "cash_claim", "cash_damage", "transport", "dsr_cost", "discount"].reduce((s, k) => s + Number((o as Record<string, unknown>)[k] ?? 0), 0);
  const d = new Date(`${o.date}T00:00:00`).toLocaleDateString("bn-BD", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div>
      <div className="mb-4 flex justify-center print:hidden"><PrintButton label="Print receipt" /></div>
      <section className="mx-auto w-[10cm] bg-white p-4 font-[system-ui] text-[12px] leading-snug text-black shadow-card print:w-[10cm] print:p-0 print:shadow-none">
        <div className="text-center">
          <p className="text-base font-extrabold">{c.name ?? "M/S Sagor Traders"}</p>
          <p>{c.address}{c.phone ? ` · ${c.phone}` : ""}</p>
        </div>
        <div className="my-2 border-y border-dashed border-black py-1">
          <p className="flex justify-between"><span>ইনভয়েস নং: {o.invoice_no}</span><span>তারিখ: {d}</span></p>
          {r?.route?.name && <p>রুট: {r.route.name}</p>}
          <p>দোকান: {r?.name_bn || r?.name || "—"}</p>
          {r?.mobile && <p>ফোন: {r.mobile}</p>}
          {r?.address && <p>ঠিকানা: {r.address}</p>}
          {sr && <p>এসআর: {sr.name}{sr.mobile ? ` (${sr.mobile})` : ""}</p>}
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-black text-left">
              <th className="py-0.5">পণ্য</th><th className="text-right">কার্টন</th><th className="text-right">পিস</th><th className="text-right">মোট</th><th className="text-right">দর</th><th className="text-right">টাকা</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="align-top">
                <td className="py-0.5 pr-1">{l.product.name_bn || l.product.name}{l.is_free || Number(l.free_qty) > 0 ? <span> (ফ্রি {bnInt(Number(l.free_qty))})</span> : null}</td>
                <td className="text-right">{bnInt(l.carton)}</td>
                <td className="text-right">{bnInt(l.piece)}</td>
                <td className="text-right">{bnInt(Number(l.sold_qty))}</td>
                <td className="text-right">{bn(Number(l.price))}</td>
                <td className="text-right">{bn(Number(l.subtotal))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 space-y-0.5 border-t border-black pt-1">
          <p className="flex justify-between"><span>মোট বিক্রয়</span><span>{bn(Number(o.total))}</span></p>
          {deductions > 0 && <p className="flex justify-between"><span>বাদ (কমিশন / ড্যামেজ ইত্যাদি)</span><span>-{bn(deductions)}</span></p>}
          <p className="flex justify-between font-extrabold"><span>সর্বমোট প্রদেয়</span><span>{bn(Number(o.payable))}</span></p>
          {Number(o.paid) > 0 && <p className="flex justify-between"><span>পরিশোধ</span><span>{bn(Number(o.paid))}</span></p>}
          {Number(o.payable) - Number(o.paid) > 0.005 && <p className="flex justify-between"><span>বাকি</span><span>{bn(Number(o.payable) - Number(o.paid))}</span></p>}
        </div>
        <div className="mt-10 flex justify-between">
          <span className="border-t border-black px-2 pt-0.5">গ্রাহকের স্বাক্ষর</span>
          <span className="border-t border-black px-2 pt-0.5">এসআর স্বাক্ষর</span>
        </div>
        <p className="mt-3 text-center">{c.receipt_footer || "ধন্যবাদ, আবার আসবেন"}</p>
      </section>
    </div>
  );
}
