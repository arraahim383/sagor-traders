import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SubmitButton } from "@/components/admin/ui";
import { Notice, fieldCls, labelCls } from "@/components/erp/ui";
import { requireErp } from "@/lib/erp/auth";
import { loadOptions } from "@/lib/erp/data";
import { MASTERS } from "@/lib/erp/masters";
import { saveMaster } from "../../actions";

export default async function MasterEdit({ params, searchParams }: { params: Promise<{ master: string; id: string }>; searchParams: Promise<{ error?: string; kind?: string }> }) {
  const { master, id } = await params;
  const m = MASTERS[master];
  if (!m) notFound();
  const { error, kind } = await searchParams;
  const { supabase } = await requireErp();
  const isNew = id === "new";

  let row: Record<string, unknown> = {};
  if (!isNew) {
    const { data } = await supabase.from(m.table).select("*").eq("id", id).maybeSingle();
    if (!data) notFound();
    row = m.fromRow ? m.fromRow(data) : data;
  } else if (m.key === "retailers") {
    // Next code after the highest numeric one, like Rushda.
    const { data } = await supabase.from("erp_retailers").select("code").order("code", { ascending: false }).limit(50);
    const max = Math.max(1000, ...(data ?? []).map((r) => Number(r.code)).filter(Number.isFinite));
    row = { code: String(max + 1) };
  }
  const options = await loadOptions(supabase, m.fields.map((f) => f.source).filter((s): s is NonNullable<typeof s> => !!s));
  const val = (name: string, def?: unknown) => {
    const v = isNew ? (row[name] ?? (name === "kind" && kind ? kind : def)) : row[name];
    return v == null ? "" : String(v);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Link href={`/erp/m/${m.key}`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-ink-600 hover:text-forest-700">
        <ArrowLeft className="size-4" /> {m.title}
      </Link>
      <h1 className="mb-6 text-3xl font-extrabold tracking-[-0.02em] text-forest-900">{isNew ? `New ${m.singular}` : String(row[m.nameField] ?? "Edit")}</h1>
      {error && <Notice tone="error">{error}</Notice>}
      <form action={saveMaster.bind(null, m.key, isNew ? null : id)} className="space-y-6">
        <div className="grid gap-5 rounded-2xl bg-white p-6 shadow-card sm:grid-cols-2 sm:p-8">
          {m.fields.filter((f) => isNew || !f.newOnly).map((f) => {
            const common = { name: f.name, id: f.name, required: f.required };
            if (f.type === "checkbox")
              return (
                <label key={f.name} className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
                  <input type="checkbox" {...common} required={false} defaultChecked={isNew ? f.defaultValue !== false : row[f.name] !== false} className="size-4 accent-forest-700" /> {f.label}
                </label>
              );
            return (
              <label key={f.name} className={f.wide || f.type === "textarea" ? "sm:col-span-2" : ""}>
                <span className={labelCls}>{f.label}{f.required && " *"}</span>
                {f.type === "select" ? (
                  <select {...common} defaultValue={val(f.name, f.defaultValue)} className={fieldCls}>
                    <option value="">—</option>
                    {(f.options ?? options[f.source!] ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea {...common} defaultValue={val(f.name, f.defaultValue)} rows={3} className={fieldCls} />
                ) : (
                  <input {...common} type={f.type === "number" ? "number" : f.type} step={f.type === "number" ? "any" : undefined} defaultValue={val(f.name, f.defaultValue)} className={fieldCls} />
                )}
                {f.help && <span className="mt-1 block text-xs text-ink-400">{f.help}</span>}
              </label>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <SubmitButton>{isNew ? `Add ${m.singular}` : "Save changes"}</SubmitButton>
          <Link href={`/erp/m/${m.key}`} className="rounded-xl px-4 py-3 text-sm font-bold text-ink-600 hover:bg-ink-900/5">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
