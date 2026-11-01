import { SubmitButton } from "@/components/admin/ui";
import { Notice, PageHeader } from "@/components/erp/ui";
import { requireErpAdmin } from "@/lib/erp/auth";
import { BUSINESS_NAV } from "@/lib/erp/nav";
import { saveRoles } from "../actions";

export const metadata = { title: "Roles & permissions" };

const ROLES = [
  { v: "manager", l: "Manager" },
  { v: "staff", l: "Staff" },
  { v: "sr", l: "SR" },
  { v: "dsr", l: "DSR" },
];

export default async function RolesPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireErpAdmin();
  const { data } = await supabase.from("erp_settings").select("value").eq("key", "roles").maybeSingle();
  const roles = (data?.value ?? {}) as Record<string, string[]>;
  const modules = BUSINESS_NAV.filter((g) => g.key !== "home" && g.key !== "setup");
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="Users & Setup" title="Roles & permissions" />
      {sp.saved && <Notice tone="ok">{sp.saved}</Notice>}
      {sp.error && <Notice tone="error">{sp.error}</Notice>}
      <form action={saveRoles} className="space-y-4">
        <div className="overflow-x-auto rounded-2xl bg-white shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-mint-50 text-left text-[11px] font-bold uppercase tracking-wider text-ink-600">
              <tr><th className="px-4 py-3">Menu</th>{ROLES.map((r) => <th key={r.v} className="px-4 py-3 text-center">{r.l}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-ink-900/5">
              {modules.map((m) => (
                <tr key={m.key}>
                  <td className="px-4 py-2 font-semibold">{m.label}</td>
                  {ROLES.map((r) => (
                    <td key={r.v} className="px-4 py-2 text-center">
                      <input type="checkbox" name={`${r.v}:${m.key}`} defaultChecked={(roles[r.v] ?? []).includes(m.key)} className="size-4 accent-forest-700" aria-label={`${r.l} can open ${m.label}`} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-ink-400">Administrators always see everything, including Users &amp; Setup. Everyone sees the dashboard. Menus a role can&apos;t open are hidden and their pages refuse to load.</p>
        <SubmitButton>Save permissions</SubmitButton>
      </form>
    </div>
  );
}
