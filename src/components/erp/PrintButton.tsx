"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full border-2 border-forest-800 px-5 py-2 text-sm font-bold text-forest-800 hover:bg-mint-50 print:hidden">
      <Printer className="size-4" /> {label}
    </button>
  );
}
