import { PasswordForm } from "@/components/admin/PasswordForm";
import { DeleteButton, Flash, SubmitButton } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import { addStaff, removeStaff } from "../../actions";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const flash = await searchParams;
  const { supabase, email, role } = await requireStaff();
  const { data: staff } = await supabase.from("staff").select("email, role, created_at").order("created_at");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-[-0.02em] text-forest-900">Account</h1>
        <p className="mt-1 text-sm text-ink-600">
          {email} · <span className="capitalize">{role}</span>
        </p>
      </div>
      <Flash {...flash} />

      <section className="rounded-2xl bg-white p-6 shadow-card sm:p-8">
        <h2 className="text-lg font-extrabold text-forest-900">Change password</h2>
        <PasswordForm />
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-card sm:p-8">
        <h2 className="text-lg font-extrabold text-forest-900">Staff</h2>
        <p className="mt-1 text-sm text-ink-600">
          People on this list can edit the website after they create an account on the admin sign-in page with the same email. Editors manage content; admins can also manage staff.
        </p>
        <ul className="mt-5 divide-y divide-ink-900/5">
          {(staff ?? []).map((s) => (
            <li key={s.email} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="font-bold">{s.email}</p>
                <p className="text-xs capitalize text-ink-600">{s.role}</p>
              </div>
              {role === "admin" && s.email !== email && <DeleteButton action={removeStaff.bind(null, s.email)} label="Remove" />}
            </li>
          ))}
        </ul>
        {role === "admin" && (
          <form action={addStaff} className="mt-5 flex flex-wrap gap-2 border-t border-ink-900/5 pt-5">
            <input name="email" type="email" required placeholder="name@example.com" aria-label="Email" className="h-11 min-w-[220px] flex-1 rounded-xl border border-ink-900/12 px-4 text-sm" />
            <select name="role" aria-label="Role" className="h-11 rounded-xl border border-ink-900/12 bg-white px-3 text-sm font-semibold">
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
            <SubmitButton className="h-11 py-0 text-sm">Add to staff</SubmitButton>
          </form>
        )}
      </section>
    </div>
  );
}
