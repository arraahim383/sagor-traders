import type { Field } from "@/lib/admin/schema";
import { cn } from "@/lib/utils";
import { ImageUpload } from "./ImageUpload";

const base =
  "w-full rounded-xl border border-ink-900/12 bg-white px-4 text-[15px] text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-leaf-500 focus:ring-4 focus:ring-leaf-400/20";

export type Option = { value: string; label: string };

export function FieldInput({ field, value, options }: { field: Field; value: unknown; options?: Option[] }) {
  const id = `f-${field.name}`;
  const v = value ?? field.defaultValue ?? "";
  if (field.type === "checkbox") {
    return (
      <label htmlFor={id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-ink-900/10 bg-white px-4 py-3">
        <input id={id} type="checkbox" name={field.name} defaultChecked={Boolean(value ?? field.defaultValue)} className="size-5 accent-[var(--color-forest-700)]" />
        <span className="text-[15px] font-semibold">{field.label}</span>
      </label>
    );
  }
  return (
    <div className={cn(field.wide && "sm:col-span-2")}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold text-ink-900">
        {field.label}
        {field.required && <span className="text-red-600"> *</span>}
      </label>
      {field.type === "image" ? (
        <ImageUpload name={field.name} defaultValue={(value as string) ?? ""} folder={field.folder ?? "uploads"} />
      ) : field.type === "textarea" || field.type === "markdown" ? (
        <textarea
          id={id}
          name={field.name}
          defaultValue={String(v)}
          placeholder={field.placeholder}
          rows={field.type === "markdown" ? 12 : 3}
          className={cn(base, "py-3", field.type === "markdown" && "font-mono text-[13px] leading-relaxed")}
        />
      ) : field.type === "select" ? (
        <select id={id} name={field.name} defaultValue={String(v)} className={cn(base, "h-12")}>
          <option value="">None</option>
          {options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          name={field.name}
          type={field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "tel" ? "tel" : field.type === "url" ? "url" : "text"}
          step={field.type === "number" ? "any" : undefined}
          defaultValue={String(v)}
          placeholder={field.placeholder}
          required={field.required}
          className={cn(base, "h-12")}
        />
      )}
      {field.help && <p className="mt-1.5 text-xs text-ink-600">{field.help}</p>}
    </div>
  );
}
