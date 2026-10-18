import Link from "next/link";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { DeleteButton, SubmitButton } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import type { Inquiry } from "@/lib/types";
import { cn, telHref, whatsappNumber } from "@/lib/utils";
import { deleteInquiry, updateInquiry } from "../../actions";

const TABS = [
  ["new", "New"],
  ["contacted", "Contacted"],
  ["closed", "Closed"],
  ["all", "All"],
] as const;

export default async function InquiriesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "new" } = await searchParams;
  const { supabase } = await requireStaff();
  let q = supabase.from("inquiries").select("*").order("created_at", { ascending: false }).limit(200);
  if (status !== "all") q = q.eq("status", status);
  const { data } = await q;
  const rows = (data ?? []) as Inquiry[];

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-3xl font-extrabold tracking-[-0.02em] text-forest-900">Inquiries</h1>
      <p className="mt-1 text-sm text-ink-600">Messages from the contact form and product requests from retailers.</p>

      <nav className="mt-6 flex gap-2" aria-label="Filter by status">
        {TABS.map(([key, label]) => (
          <Link
            key={key}
            href={`/admin/inquiries?status=${key}`}
            className={cn("rounded-full px-4 py-2 text-sm font-bold", status === key ? "bg-forest-900 text-white" : "bg-white text-ink-600 shadow-card")}
          >
            {label}
          </Link>
        ))}
      </nav>

      <ul className="mt-6 space-y-4">
        {rows.length === 0 && <li className="rounded-2xl bg-white p-10 text-center text-ink-600 shadow-card">Nothing in this list.</li>}
        {rows.map((r) => {
          const wa = whatsappNumber(r.phone);
          return (
            <li key={r.id} className="rounded-2xl bg-white p-5 shadow-card sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-leaf-600">
                    {r.kind === "product" ? "Product request" : "Message"} · {new Date(r.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                  <p className="mt-1 text-lg font-extrabold">
                    {r.name}
                    {r.shop_name && <span className="font-semibold text-ink-600"> · {r.shop_name}</span>}
                    {r.area && <span className="font-medium text-ink-400"> · {r.area}</span>}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.phone && (
                    <a href={telHref(r.phone)} className="inline-flex items-center gap-1.5 rounded-full bg-forest-900 px-3.5 py-2 text-xs font-bold text-white">
                      <Phone className="size-3.5" /> {r.phone}
                    </a>
                  )}
                  {wa && (
                    <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-[#25d366] px-3.5 py-2 text-xs font-bold text-white">
                      <MessageCircle className="size-3.5" /> WhatsApp
                    </a>
                  )}
                  {r.email && (
                    <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1.5 rounded-full border border-forest-800 px-3.5 py-2 text-xs font-bold text-forest-800">
                      <Mail className="size-3.5" /> {r.email}
                    </a>
                  )}
                </div>
              </div>
              {r.product_name && (
                <p className="mt-3 rounded-xl bg-mint-50 px-4 py-2.5 text-sm font-semibold text-forest-900">
                  Wants: {r.product_name}
                  {r.quantity ? ` · Quantity: ${r.quantity}` : ""}
                </p>
              )}
              {r.message && <p className="mt-3 whitespace-pre-line text-[15px] text-ink-900">{r.message}</p>}
              <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-ink-900/5 pt-4">
              <form action={updateInquiry.bind(null, r.id)} className="flex flex-1 flex-wrap items-end gap-3">
                <label className="text-xs font-bold text-ink-600">
                  Status
                  <select name="status" defaultValue={r.status} className="mt-1 block h-10 rounded-lg border border-ink-900/10 bg-white px-3 text-sm font-semibold text-ink-900">
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="closed">Closed</option>
                  </select>
                </label>
                <label className="min-w-[220px] flex-1 text-xs font-bold text-ink-600">
                  Note for the team
                  <input name="staff_note" defaultValue={r.staff_note ?? ""} placeholder="e.g. Delivered on Sunday" className="mt-1 block h-10 w-full rounded-lg border border-ink-900/10 px-3 text-sm text-ink-900" />
                </label>
                <SubmitButton className="h-10 rounded-lg px-4 py-0 text-sm">Update</SubmitButton>
              </form>
              <DeleteButton action={deleteInquiry.bind(null, r.id)} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
