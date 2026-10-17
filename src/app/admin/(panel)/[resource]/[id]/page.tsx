import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { FieldInput, type Option } from "@/components/admin/FieldInput";
import { Flash, SubmitButton } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import { RESOURCES } from "@/lib/admin/schema";
import { saveResource } from "../../../actions";

export default async function ResourceEdit({
  params,
  searchParams,
}: {
  params: Promise<{ resource: string; id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { resource, id } = await params;
  const res = RESOURCES[resource];
  if (!res) notFound();
  const { error } = await searchParams;
  const { supabase } = await requireStaff();
  const isNew = id === "new";

  let row: Record<string, unknown> = {};
  if (!isNew) {
    const { data } = await supabase.from(res.table).select("*").eq("id", id).maybeSingle();
    if (!data) notFound();
    row = data;
  }

  const optionSources = new Set(res.fields.map((f) => f.options).filter(Boolean));
  const options: Record<string, Option[]> = {};
  if (optionSources.has("brands")) {
    const { data } = await supabase.from("brands").select("id,name").order("sort_order");
    options.brands = (data ?? []).map((b) => ({ value: b.id, label: b.name }));
  }
  if (optionSources.has("categories")) {
    const { data } = await supabase.from("categories").select("id,name").order("sort_order");
    options.categories = (data ?? []).map((c) => ({ value: c.id, label: c.name }));
  }
  if (optionSources.has("products")) {
    const { data } = await supabase.from("products").select("id,name").order("name");
    options.products = (data ?? []).map((p) => ({ value: p.id, label: p.name }));
  }

  const action = saveResource.bind(null, res.key, isNew ? null : id);
  const checkboxes = res.fields.filter((f) => f.type === "checkbox");
  const others = res.fields.filter((f) => f.type !== "checkbox");

  return (
    <div className="mx-auto max-w-4xl">
      <Link href={`/admin/${res.key}`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-ink-600 hover:text-forest-700">
        <ArrowLeft className="size-4" /> {res.title}
      </Link>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-[-0.02em] text-forest-900">
          {isNew ? `New ${res.singular}` : String(row[res.nameField] ?? "Edit")}
        </h1>
        {!isNew && res.key === "products" && (
          <a href={`/products/${row.slug}`} target="_blank" className="inline-flex items-center gap-1.5 text-sm font-bold text-forest-700 hover:underline">
            View on website <ExternalLink className="size-4" />
          </a>
        )}
      </div>
      <Flash error={error} />
      <form action={action} className="space-y-6">
        <div className="grid gap-5 rounded-2xl bg-white p-6 shadow-card sm:grid-cols-2 sm:p-8">
          {others.map((f) => (
            <FieldInput key={f.name} field={f} value={isNew ? undefined : row[f.name]} options={f.options ? options[f.options] : undefined} />
          ))}
        </div>
        {checkboxes.length > 0 && (
          <div className="grid gap-3 rounded-2xl bg-white p-6 shadow-card sm:grid-cols-2 sm:p-8">
            {checkboxes.map((f) => (
              <FieldInput key={f.name} field={f} value={isNew ? undefined : row[f.name]} />
            ))}
          </div>
        )}
        <div className="flex items-center gap-3">
          <SubmitButton>{isNew ? `Add ${res.singular}` : "Save changes"}</SubmitButton>
          <Link href={`/admin/${res.key}`} className="rounded-xl px-4 py-3 text-sm font-bold text-ink-600 hover:bg-ink-900/5">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
