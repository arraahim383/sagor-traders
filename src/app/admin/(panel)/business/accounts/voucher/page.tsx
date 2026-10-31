import { VoucherForm } from "@/components/erp/VoucherForm";
import { requireStaff } from "@/lib/admin/auth";
import { saveVoucher } from "../actions";

export const metadata = { title: "Journal voucher" };

export default async function VoucherPage() {
  const { supabase } = await requireStaff();
  const { data } = await supabase.from("erp_accounts").select("id, code, name").eq("active", true).order("code");
  return <VoucherForm accounts={(data ?? []).map((a) => ({ id: a.id, label: `${a.code} — ${a.name}` }))} onSave={saveVoucher} />;
}
