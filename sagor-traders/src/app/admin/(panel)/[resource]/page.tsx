import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { DeleteButton, Flash } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import { RESOURCES } from "@/lib/admin/schema";
import { deleteResource } from "../../actions";

type Row = Record<string, unknown> & { id: string };

function pick(row: Row, path: string): string {
  const v = path.split(".").reduce<unknown>((acc, k) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[k] : undefined), row);
  return v == null || v === "" ? "—" : String(v);
}

export default async function ResourceList({
  params,
  searchParams,
}: {
  params: Promise<{ resource: string }>;
  searchParams: Promise<{ saved?: string; deleted?: string; error?: string }>;
}) {
  const { resource } = await params;
  const res = RESOURCES[resource];
  if (!res) notFound();
  const flash = await searchParams;
  const { supabase } = await requireStaff();
  let q = supabase.from(res.table).select(res.select ?? "*");
  for (const o of res.order) q = q.order(o.column, { ascending: o.ascending, nullsFirst: false });
  const { data, error } = await q;
  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-[-0.02em] text-forest-900">{res.title}</h1>
          <p className="mt-1 text-sm text-ink-600">
            {rows.length} {rows.length === 1 ? res.singular : `${res.singular}s`}. Changes appear on the website straight away.
          </p>
        </div>
        <Link href={`/admin/${res.key}/new`} className="btn-forest inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold">
          <Plus className="size-4" /> Add {res.singular}
        </Link>
      </div>
      <Flash {...flash} error={flash.error ?? error?.message} />

      <div className="overflow-hidden rounded-2xl bg-white shadow-card">
        {rows.length === 0 ? (
          <p className="p-10 text-center text-ink-600">Nothing here yet.</p>
        ) : (
          <ul className="divide-y divide-ink-900/5">
            {rows.map((row) => {
              const img = res.imageField ? (row[res.imageField] as string | null) : null;
              return (
                <li key={row.id} className="flex flex-wrap items-center gap-4 px-4 py-3 sm:flex-nowrap sm:px-5">
                  {res.imageField && (
                    <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-mint-50">
                      {img && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt="" className="size-full object-cover" />
                      )}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/${res.key}/${row.id}`} className="block truncate text-[15px] font-bold text-ink-900 hover:text-forest-700">
                      {pick(row, res.nameField)}
                    </Link>
                    <p className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-600">
                      {res.columns.map((c) => (
                        <span key={c.label}>
                          <span className="text-ink-400">{c.label}:</span> {pick(row, c.get)}
                        </span>
                      ))}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {res.flags?.map((f) => {
                      const on = Boolean(row[f.field]);
                      const text = on ? f.on : f.off;
                      return text ? (
                        <span key={f.field} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${on ? "bg-mint-50 text-forest-800" : "bg-amber-50 text-amber-800"}`}>
                          {text}
                        </span>
                      ) : null;
                    })}
                  </div>
                  <div className="flex items-center gap-1">
                    <Link href={`/admin/${res.key}/${row.id}`} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-forest-700 hover:bg-mint-50">
                      <Pencil className="size-3.5" /> Edit
                    </Link>
                    <DeleteButton action={deleteResource.bind(null, res.key, row.id)} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
