import Link from "next/link";
import { PageHeader } from "@/components/erp/ui";
import { REPORTS, REPORT_GROUPS, reportHref } from "@/lib/erp/reports";

export const metadata = { title: "Reports" };

export default function ReportsHub() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Reports" title="Report center" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {REPORT_GROUPS.map((g) => (
          <section key={g} className="rounded-2xl bg-white p-5 shadow-card">
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.25em] text-leaf-600">{g}</h2>
            <ul className="space-y-1">
              {REPORTS.filter((r) => r.group === g).map((r) => (
                <li key={r.key}>
                  <Link href={reportHref(r)} className="block rounded-lg px-2 py-1.5 text-sm font-semibold text-forest-900 hover:bg-mint-50">
                    {r.label}
                    {r.note && <span className="block text-xs font-normal text-ink-400">{r.note}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
