"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, LayoutGrid, LogOut, Menu, X } from "lucide-react";
import { Logo } from "@/components/decor";
import { BUSINESS_NAV, activeHref, canOpen } from "@/lib/erp/nav";
import { cn } from "@/lib/utils";

/** The ERP's own sidebar: every Rushda heading as a collapsible group. Separate from the website admin. */
export function ErpShell({ email, roleLabel, modules, signOut, children }: { email: string; roleLabel: string; modules: string[] | null; signOut: () => Promise<void>; children: React.ReactNode }) {
  const path = usePathname();
  const search = useSearchParams();
  const active = activeHref(path, search);
  const groups = BUSINESS_NAV.filter((g) => canOpen(modules, g.key));
  const current = groups.find((g) => g.links.some((l) => l.href === active))?.key;
  const [open, setOpen] = useState<Set<string>>(() => new Set(current ? [current] : []));
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (current) setOpen((s) => (s.has(current) ? s : new Set(s).add(current)));
    setDrawer(false);
  }, [current, path]);

  const toggle = (k: string) => setOpen((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  return (
    <div className="lg:grid lg:grid-cols-[272px_1fr]">
      <div className="sticky top-0 z-40 flex items-center justify-between bg-forest-950 px-5 py-3 text-white lg:hidden print:hidden">
        <span className="text-[1.5rem]"><Logo text="Sagor Traders" light /></span>
        <button onClick={() => setDrawer((v) => !v)} aria-label="Menu" aria-expanded={drawer} className="rounded-lg p-2">
          {drawer ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>
      <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col bg-forest-950 text-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 print:hidden", drawer ? "translate-x-0" : "-translate-x-full")}>
        <div className="px-6 pb-3 pt-6 text-[1.8rem]">
          <Logo text="Sagor Traders" light />
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.25em] text-lime-200/80">Business ERP</p>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="ERP">
          {groups.map((g) =>
            g.links.length === 1 ? (
              <Link key={g.key} href={g.links[0].href} className={cn("mb-0.5 block rounded-xl px-3.5 py-2 text-[14px] font-bold transition", active === g.links[0].href ? "bg-lime-200 text-forest-950" : "text-white/85 hover:bg-white/10")}>
                {g.label}
              </Link>
            ) : (
              <div key={g.key} className="mb-0.5">
                <button onClick={() => toggle(g.key)} aria-expanded={open.has(g.key)} className={cn("flex w-full items-center justify-between rounded-xl px-3.5 py-2 text-left text-[14px] font-bold transition hover:bg-white/10", current === g.key ? "text-lime-200" : "text-white/85")}>
                  {g.label}
                  <ChevronDown className={cn("size-4 transition", open.has(g.key) && "rotate-180")} />
                </button>
                {open.has(g.key) && (
                  <ul className="mb-1 ml-3 border-l border-white/10 pl-2">
                    {g.links.map((l) => (
                      <li key={l.href}>
                        <Link href={l.href} className={cn("block rounded-lg px-3 py-1.5 text-[13px] font-semibold transition", active === l.href ? "bg-lime-200 text-forest-950" : "text-white/70 hover:bg-white/10 hover:text-white")}>
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ),
          )}
        </nav>
        <div className="space-y-1 border-t border-white/10 p-4">
          <Link href="/admin" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/10">
            <LayoutGrid className="size-4" /> Website admin
          </Link>
          <div className="px-3 text-xs text-white/50">
            <p className="truncate">{email}</p>
            <p>{roleLabel}</p>
          </div>
          <form action={signOut}>
            <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/10">
              <LogOut className="size-4" /> Sign out
            </button>
          </form>
        </div>
      </aside>
      {drawer && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setDrawer(false)} />}
      <main className="min-w-0 px-5 pb-20 pt-6 md:px-10 lg:pt-8">{children}</main>
    </div>
  );
}
