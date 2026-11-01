import Link from "next/link";
import { Plus } from "lucide-react";
import { requireErp } from "@/lib/erp/auth";
import { ButtonLink, DataTable, FilterBar, PageHeader, dateLabel, fieldCls, labelCls, money, monthStart, today } from "@/components/erp/ui";

export const metadata = { title: "Receive notes" };

type Row = { id: number; grn_no: string; date: string; invoice_no: string | null; subtotal: number; commission: number; transport: number; payable: number; paid: number; advance_applied: number; supplier: { name: string; mobile: string | null } };

export default async function ReceiveNotes({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  const from = sp.from || monthStart();
  const to = sp.to || today();
  const { supabase } = await requireErp();
  const { data } = await supabase.from("erp_goods_receipts").select("id, grn_no, date, invoice_no, subtotal, commission, transport, payable, paid, advance_applied, supplier:erp_suppliers(name, mobile)").gte("date", from).lte("date", to).order("id", { ascending: false });
  const rows = (data ?? []) as unknown as Row[];
  const due = (r: Row) => Number(r.payable) - Number(r.paid) - Number(r.advance_applied);
  const total = (k: keyof Row) => money(rows.reduce((s, r) => s + Number(r[k]), 0));
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Purchase" title="Receive notes">
        <ButtonLink href="/erp/receive/new"><Plus className="size-4" /> Goods receive</ButtonLink>
      </PageHeader>
      <FilterBar>
        <label><span className={labelCls}>From</span><input type="date" name="from" defaultValue={from} className={fieldCls} /></label>
        <label><span className={labelCls}>To</span><input type="date" name="to" defaultValue={to} className={fieldCls} /></label>
      </FilterBar>
      <DataTable
        rows={rows}
        empty="No goods received in this period."
        cols={[
          { label: "GRN #", get: (r) => <Link href={`/erp/receive/${r.id}`} className="font-bold text-forest-800 hover:underline">{r.grn_no}</Link> },
          { label: "Date", get: (r) => dateLabel(r.date) },
          { label: "Supplier", get: (r) => r.supplier.name },
          { label: "Mobile", get: (r) => r.supplier.mobile ?? "—" },
          { label: "Invoice #", get: (r) => r.invoice_no ?? "—" },
          { label: "Sub total", right: true, get: (r) => money(r.subtotal) },
          { label: "Payable", right: true, get: (r) => money(r.payable) },
          { label: "Paid", right: true, get: (r) => money(r.paid) },
          { label: "Due", right: true, get: (r) => <span className={due(r) > 0.005 ? "font-bold text-red-600" : ""}>{money(due(r))}</span> },
        ]}
        foot={[`${rows.length} notes`, "", "", "", "", total("subtotal"), total("payable"), total("paid"), money(rows.reduce((s, r) => s + due(r), 0))]}
      />
    </div>
  );
}
