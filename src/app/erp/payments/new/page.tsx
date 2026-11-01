import { PaymentForm, type PayParty } from "@/components/erp/PaymentForm";
import { requireErp } from "@/lib/erp/auth";
import { loadRetailers, partyBalances, selectAll } from "@/lib/erp/data";
import { savePayment } from "../actions";

export const metadata = { title: "Receive / pay" };

export default async function NewPaymentPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const { supabase } = await requireErp();
  const [retailers, staff, suppliers, orders, bR, bS, bD, bSup, bStaff] = await Promise.all([
    loadRetailers(supabase),
    supabase.from("erp_staff").select("id, kind, name").eq("active", true).order("name"),
    supabase.from("erp_suppliers").select("id, name").order("name"),
    selectAll<{ id: number; invoice_no: string; due: number; party_type: "retailer" | "sr" | "dsr"; party_id: number }>((a, b) =>
      supabase.from("erp_open_invoices").select("id, invoice_no, due, party_type, party_id").order("id").range(a, b),
    ),
    partyBalances(supabase, "retailer"),
    partyBalances(supabase, "sr"),
    partyBalances(supabase, "dsr"),
    partyBalances(supabase, "supplier"),
    partyBalances(supabase, "staff"),
  ]);
  const people = staff.data ?? [];
  const map = (rows: { id: number; name: string }[], bal: Map<number, number>): PayParty[] => rows.map((r) => ({ id: r.id, name: r.name, balance: bal.get(r.id) ?? 0 }));
  const parties = {
    retailer: map(retailers.map((r) => ({ id: r.id, name: `${r.code} - ${r.name}` })), bR),
    sr: map(people.filter((p) => p.kind === "sr"), bS),
    dsr: map(people.filter((p) => p.kind === "dsr"), bD),
    supplier: map(suppliers.data ?? [], bSup),
    staff: map(people, bStaff),
  };
  // Open invoices already net of later collections that referenced them.
  const dues = orders.map((o) => ({ partyType: o.party_type, partyId: Number(o.party_id), invoice: o.invoice_no, due: Number(o.due) }));
  const initialType = (["retailer", "sr", "dsr", "supplier", "staff"].includes(type ?? "") ? type : "retailer") as "retailer";
  return <PaymentForm parties={parties} dues={dues} onSave={savePayment} initialType={initialType} />;
}
