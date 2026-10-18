"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BadgePercent, ExternalLink, Inbox, LayoutDashboard, LogOut, Menu, Package, Settings, Shapes, Tags, UserCog, Users, X } from "lucide-react";
import { Logo } from "@/components/decor";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/inquiries", label: "Inquiries", icon: Inbox },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/brands", label: "Brands", icon: Tags },
  { href: "/admin/categories", label: "Product types", icon: Shapes },
  { href: "/admin/team", label: "Team", icon: Users },
  { href: "/admin/offers", label: "Offers", icon: BadgePercent },
  { href: "/admin/settings", label: "Site settings", icon: Settings },
  { href: "/admin/account", label: "Account", icon: UserCog },
];

export function AdminNav({ email, role, signOut }: { email: string; role: string; signOut: () => Promise<void> }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));
  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between bg-forest-950 px-5 py-3 text-white lg:hidden">
        <span className="text-[1.6rem]"><Logo text="Sagor Traders" light /></span>
        <button onClick={() => setOpen((v) => !v)} aria-label="Menu" aria-expanded={open} className="rounded-lg p-2">
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-forest-950 text-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="px-6 pb-4 pt-7 text-[1.9rem]">
          <Logo text="Sagor Traders" light />
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.25em] text-lime-200/80">Admin</p>
        </div>
        <nav className="flex-1 overflow-y-auto px-3">
          <ul className="space-y-1">
            {LINKS.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] font-semibold transition",
                    isActive(href) ? "bg-lime-200 text-forest-950" : "text-white/80 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icon className="size-[18px]" /> {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="space-y-2 border-t border-white/10 p-4">
          <a href="/" target="_blank" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/10">
            <ExternalLink className="size-4" /> View website
          </a>
          <div className="px-3 text-xs text-white/50">
            <p className="truncate">{email}</p>
            <p className="capitalize">{role}</p>
          </div>
          <form action={signOut}>
            <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/10">
              <LogOut className="size-4" /> Sign out
            </button>
          </form>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}
    </>
  );
}
