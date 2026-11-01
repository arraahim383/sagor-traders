import { SubmitButton } from "@/components/admin/ui";
import { Card, Notice, PageHeader, fieldCls, labelCls } from "@/components/erp/ui";
import { requireErpAdmin } from "@/lib/erp/auth";
import { saveCompany } from "../actions";

export const metadata = { title: "Company" };

export default async function CompanyPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireErpAdmin();
  const { data } = await supabase.from("erp_settings").select("value").eq("key", "company").maybeSingle();
  const c = (data?.value ?? {}) as Record<string, string>;
  const field = (name: string, label: string, wide = false) => (
    <label className={wide ? "sm:col-span-2" : ""}><span className={labelCls}>{label}</span><input name={name} defaultValue={c[name] ?? ""} className={fieldCls} /></label>
  );
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Users & Setup" title="Company" />
      {sp.saved && <Notice tone="ok">{sp.saved}</Notice>}
      {sp.error && <Notice tone="error">{sp.error}</Notice>}
      <Card>
        <form action={saveCompany} className="grid gap-4 sm:grid-cols-2">
          {field("name", "Company name", true)}
          {field("address", "Address", true)}
          {field("phone", "Phone")}
          {field("email", "Email")}
          {field("receipt_footer", "Receipt footer", true)}
          {field("logo_url", "Logo image address (optional)", true)}
          <div className="sm:col-span-2"><SubmitButton>Save</SubmitButton></div>
        </form>
        <p className="mt-3 text-xs text-ink-400">Printed on invoices, receipts and payslips. Separate from the website&apos;s own settings.</p>
      </Card>
    </div>
  );
}
