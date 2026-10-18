import Link from "next/link";
import { ArrowRight, BadgePercent, Inbox, Package, Tags, Users } from "lucide-react";
import { requireStaff } from "@/lib/admin/auth";
import type { Inquiry } from "@/lib/types";

function ago(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)} min ago`;
  const h = Math.round(mins / 60);
  if (h < 48) return `${h} h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default async function Dashboard() {
  const { supabase, email } = await requireStaff();
  const today = new Date().toISOString().slice(0, 10);
  const count = (table: string) => supabase.from(table).select("id", { count: "exact", head: true });
  const [newInq, products, brands, team, offers, latest] = await Promise.all([
    count("inquiries").eq("status", "new"),
    count("products").eq("is_active", true),
    count("brands"),
    count("team_members").eq("is_visible", true),
    count("offers").eq("is_active", true).or(`ends_on.is.null,ends_on.gte.${today}`),
    supabase.from("inquiries").select("*").order("created_at", { ascending: false }).limit(6),
  ]);
  const cards = [
    { label: "New inquiries", value: newInq.count ?? 0, href: "/admin/inquiries", icon: Inbox, hot: (newInq.count ?? 0) > 0 },
    { label: "Live products", value: products.count ?? 0, href: "/admin/products", icon: Package },
    { label: "Brands", value: brands.count ?? 0, href: "/admin/brands", icon: Tags },
    { label: "Team members", value: team.count ?? 0, href: "/admin/team", icon: Users },
    { label: "Running offers", value: offers.count ?? 0, href: "/admin/offers", icon: BadgePercent },
  ];
  const rows = (latest.data ?? []) as Inquiry[];

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-3xl font-extrabold tracking-[-0.02em] text-forest-900">Welcome back</h1>
      <p className="mt-1 text-sm text-ink-600">Signed in as {email}</p>

      <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-5">
        {cards.map(({ label, value, href, icon: Icon, hot }) => (
          <li key={label}>
            <Link href={href} className={`block rounded-2xl p-5 shadow-card transition hover:-translate-y-0.5 ${hot ? "bg-forest-900 text-white" : "bg-white"}`}>
              <Icon className={`size-5 ${hot ? "text-lime-200" : "text-leaf-600"}`} />
              <p className="mt-3 text-3xl font-extrabold">{value}</p>
              <p className={`text-sm font-semibold ${hot ? "text-white/80" : "text-ink-600"}`}>{label}</p>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-10 rounded-2xl bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Latest inquiries</h2>
          <Link href="/admin/inquiries" className="inline-flex items-center gap-1 text-sm font-bold text-forest-700">
            All inquiries <ArrowRight className="size-4" />
          </Link>
        </div>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-ink-600">No messages yet. They appear here as soon as someone uses the contact or product form.</p>
        ) : (
          <ul className="divide-y divide-ink-900/5">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-bold">
                    {r.name}
                    {r.shop_name ? <span className="font-medium text-ink-600"> · {r.shop_name}</span> : null}
                  </p>
                  <p className="truncate text-sm text-ink-600">{r.product_name ? `Wants ${r.product_name}${r.quantity ? ` (${r.quantity})` : ""}` : r.message}</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="text-ink-400">{ago(r.created_at)}</span>
                  <span className={`rounded-full px-2.5 py-1 ${r.status === "new" ? "bg-lime-200 text-forest-950" : "bg-ink-900/5 text-ink-600"}`}>{r.status}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
