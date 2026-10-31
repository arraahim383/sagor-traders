import Link from "next/link";
import { Plus } from "lucide-react";
import { requireStaff } from "@/lib/admin/auth";
import { Badge, ButtonLink, DataTable, PageHeader, dateLabel, money, qty } from "@/components/erp/ui";

export const metadata = { title: "Purchase orders" };

type Row = { id: number; po_no: string; date: string; status: string; subtotal: number; supplier: { name: string }; lines: { qty: number; received_qty: number }[] };

export default async function PurchaseOrderList() {
  const { supabase } = await requireStaff();
  const { data } = await supabase.from("erp_purchase_orders").select("id, po_no, date, status, subtotal, supplier:erp_suppliers(name), lines:erp_purchase_order_lines(qty, received_qty)").order("id", { ascending: false }).limit(200);
  const rows = (data ?? []) as unknown as Row[];
  const sumQ = (r: Row, k: "qty" | "received_qty") => r.lines.reduce((s, l) => s + Number(l[k]), 0);
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Purchase" title="Purchase orders">
        <ButtonLink href="/admin/business/purchase/new"><Plus className="size-4" /> New PO</ButtonLink>
      </PageHeader>
      <DataTable
        rows={rows}
        empty="No purchase orders yet."
        cols={[
          { label: "PO #", get: (r) => <Link href={`/admin/business/purchase/${r.id}`} className="font-bold text-forest-800 hover:underline">{r.po_no}</Link> },
          { label: "Date", get: (r) => dateLabel(r.date) },
          { label: "Supplier", get: (r) => r.supplier.name },
          { label: "Ordered", right: true, get: (r) => qty(sumQ(r, "qty")) },
          { label: "Received", right: true, get: (r) => qty(sumQ(r, "received_qty")) },
          { label: "Pending", right: true, get: (r) => qty(Math.max(0, sumQ(r, "qty") - sumQ(r, "received_qty"))) },
          { label: "Amount", right: true, get: (r) => money(r.subtotal) },
          { label: "Status", get: (r) => <Badge tone={r.status === "received" ? "lime" : "amber"}>{r.status}</Badge> },
        ]}
      />
    </div>
  );
}
