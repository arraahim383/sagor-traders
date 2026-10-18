import { FieldInput } from "@/components/admin/FieldInput";
import { Flash, SubmitButton } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import { SETTINGS_GROUPS } from "@/lib/admin/schema";
import type { Stat } from "@/lib/types";
import { saveSettings } from "../../actions";

const ICON_CHOICES: [Stat["icon"], string][] = [
  ["truck", "Truck"],
  ["users", "People"],
  ["map-pin", "Map pin"],
  ["store", "Shop"],
  ["award", "Award"],
  ["package", "Box"],
];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const flash = await searchParams;
  const { supabase } = await requireStaff();
  const { data } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
  const s = (data ?? {}) as Record<string, unknown>;
  const stats = (Array.isArray(s.stats) ? s.stats : []) as Stat[];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-extrabold tracking-[-0.02em] text-forest-900">Site settings</h1>
      <p className="mb-6 mt-1 text-sm text-ink-600">Text, photos and contact details used across the website.</p>
      <Flash {...flash} />
      <form action={saveSettings} className="space-y-6">
        {SETTINGS_GROUPS.map((g) => (
          <fieldset key={g.title} className="rounded-2xl bg-white p-6 shadow-card sm:p-8">
            <legend className="sr-only">{g.title}</legend>
            <h2 className="mb-5 text-lg font-extrabold text-forest-900">{g.title}</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              {g.fields.map((f) => (
                <FieldInput key={f.name} field={f} value={s[f.name]} />
              ))}
            </div>
            {g.title === "About" && (
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-bold">Highlight cards (home page)</h3>
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="grid grid-cols-[130px_90px_1fr] gap-2">
                      <select name={`stat_icon_${i}`} defaultValue={stats[i]?.icon ?? "truck"} aria-label={`Card ${i + 1} icon`} className="h-11 rounded-xl border border-ink-900/12 bg-white px-3 text-sm">
                        {ICON_CHOICES.map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                      <input name={`stat_value_${i}`} defaultValue={stats[i]?.value ?? ""} placeholder="22+" aria-label={`Card ${i + 1} number`} className="h-11 rounded-xl border border-ink-900/12 px-3 text-sm" />
                      <input name={`stat_label_${i}`} defaultValue={stats[i]?.label ?? ""} placeholder="Team Members" aria-label={`Card ${i + 1} label`} className="h-11 rounded-xl border border-ink-900/12 px-3 text-sm" />
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-ink-600">Leave a label empty to hide that card. The number is optional.</p>
              </div>
            )}
          </fieldset>
        ))}
        <div className="sticky bottom-4 flex justify-end">
          <SubmitButton className="shadow-xl">Save settings</SubmitButton>
        </div>
      </form>
    </div>
  );
}
