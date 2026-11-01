import { SubmitButton } from "@/components/admin/ui";
import { Badge, Card, DataTable, Notice, PageHeader, fieldCls, labelCls } from "@/components/erp/ui";
import { requireErpAdmin } from "@/lib/erp/auth";
import { removeUser, saveUser } from "../actions";

export const metadata = { title: "Users" };

const ROLES = [
  { v: "administrator", l: "Administrator (everything)" },
  { v: "manager", l: "Manager" },
  { v: "staff", l: "Staff" },
  { v: "sr", l: "SR" },
  { v: "dsr", l: "DSR" },
];

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const { supabase, email: me } = await requireErpAdmin();
  const [{ data: users }, { data: site }] = await Promise.all([
    supabase.from("erp_user_roles").select("email, name, phone, role").order("email"),
    supabase.from("staff").select("email, role").order("email"),
  ]);
  const erp = new Map((users ?? []).map((u) => [u.email, u]));
  const siteStaff = (site ?? []).filter((s) => !erp.has(s.email));
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="Users & Setup" title="Users" />
      {sp.saved && <Notice tone="ok">{sp.saved}</Notice>}
      {sp.error && <Notice tone="error">{sp.error}</Notice>}
      <Card title="Add or change a user" className="mb-6">
        <form action={saveUser} className="grid gap-4 sm:grid-cols-4">
          <label className="sm:col-span-2"><span className={labelCls}>Email</span><input type="email" name="email" required className={fieldCls} /></label>
          <label><span className={labelCls}>Name</span><input name="name" className={fieldCls} /></label>
          <label><span className={labelCls}>Phone</span><input name="phone" className={fieldCls} /></label>
          <label className="sm:col-span-2"><span className={labelCls}>Role</span><select name="role" defaultValue="staff" className={fieldCls}>{ROLES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}</select></label>
          <div className="flex items-end sm:col-span-2"><SubmitButton>Save user</SubmitButton></div>
        </form>
        <p className="mt-3 text-xs text-ink-400">
          The person then opens the sign-in page, chooses &ldquo;Create account&rdquo; with this same email and sets their own password. ERP users get no access to the website admin.
        </p>
      </Card>
      <DataTable
        rows={users ?? []}
        empty="No ERP users added yet."
        cols={[
          { label: "Email", get: (u) => <b>{u.email}</b> },
          { label: "Name", get: (u) => u.name ?? "—" },
          { label: "Phone", get: (u) => u.phone ?? "—" },
          { label: "Role", get: (u) => <Badge tone={u.role === "administrator" ? "lime" : "grey"}>{ROLES.find((r) => r.v === u.role)?.l ?? u.role}</Badge> },
          {
            label: "",
            get: (u) =>
              u.email === me ? null : (
                <form action={removeUser.bind(null, u.email)}>
                  <button className="text-xs font-bold text-red-600 hover:underline">Remove</button>
                </form>
              ),
          },
        ]}
      />
      {siteStaff.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-lg font-extrabold">Website staff (also have ERP access)</h2>
          <DataTable
            rows={siteStaff}
            cols={[
              { label: "Email", get: (s) => s.email },
              { label: "ERP access", get: (s) => (s.role === "admin" ? "Administrator (website admin)" : "Manager (website editor)") },
            ]}
          />
          <p className="mt-2 text-xs text-ink-400">Add a website editor above to give them a different ERP role. Website staff themselves are managed in the website admin under Account.</p>
        </>
      )}
    </div>
  );
}
