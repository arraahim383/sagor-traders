"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BUSINESS_NAV, groupFor } from "@/lib/erp/nav";
import { cn } from "@/lib/utils";

/** Two rows: module groups, then the current group's pages. Scrolls sideways on phones. */
export function BusinessNav() {
  const path = usePathname();
  const group = groupFor(path);
  const exact = (href: string) => path === href || (href !== "/admin/business" && path.startsWith(href + "/") && !group.links.some((l) => l.href !== href && l.href.startsWith(href) && path.startsWith(l.href)));
  return (
    <nav className="mx-auto mb-6 max-w-[1400px] space-y-2 print:hidden" aria-label="Business">
      <div className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5 md:mx-0 md:px-0">
        {BUSINESS_NAV.map((g) => (
          <Link
            key={g.key}
            href={g.links[0].href}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-bold transition",
              g.key === group.key ? "bg-forest-900 text-white" : "bg-white text-ink-600 shadow-card hover:text-forest-800",
            )}
          >
            {g.label}
          </Link>
        ))}
      </div>
      {group.links.length > 1 && (
        <div className="no-scrollbar -mx-5 flex gap-1 overflow-x-auto px-5 md:mx-0 md:px-0">
          {group.links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-bold transition", exact(l.href) ? "bg-lime-200 text-forest-950" : "text-ink-600 hover:bg-mint-50")}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
