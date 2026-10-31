"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { num, round2 } from "@/lib/erp/money";
import type { PostResult } from "@/lib/erp/purchase-payload";
import { cn } from "@/lib/utils";
import { fieldCls, labelCls } from "./ui";

type Line = { id: number; accountId: string; debit: string; credit: string };

/** Journal voucher: debit and credit on one line are exclusive; must balance to save. */
export function VoucherForm({ accounts, onSave }: { accounts: { id: number; label: string }[]; onSave: (i: { date: string; narration: string; lines: { accountId: number; debit: number; credit: number }[] }) => Promise<PostResult> }) {
  const [date, setDate] = useState(() => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date()));
  const [narration, setNarration] = useState("");
  const [lines, setLines] = useState<Line[]>([{ id: 1, accountId: "", debit: "", credit: "" }, { id: 2, accountId: "", debit: "", credit: "" }]);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [saving, start] = useTransition();
  const debit = round2(lines.reduce((s, l) => s + num(l.debit), 0));
  const credit = round2(lines.reduce((s, l) => s + num(l.credit), 0));
  const set = (id: number, patch: Partial<Line>) => setLines((x) => x.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  function submit() {
    start(async () => {
      const res = await onSave({ date, narration, lines: lines.map((l) => ({ accountId: Number(l.accountId), debit: num(l.debit), credit: num(l.credit) })) });
      if (!res.ok) return setMsg({ tone: "error", text: res.error });
      setMsg({ tone: "ok", text: `${res.number} posted.` });
      setNarration("");
      setLines([{ id: 1, accountId: "", debit: "", credit: "" }, { id: 2, accountId: "", debit: "", credit: "" }]);
    });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-leaf-600">Accounts</p>
        <h1 className="text-3xl font-extrabold tracking-[-0.02em] text-forest-900">Journal voucher</h1>
      </div>
      {msg && <p className={cn("mb-5 rounded-2xl px-4 py-3 text-sm font-semibold", msg.tone === "ok" ? "bg-lime-100 text-forest-800" : "bg-red-50 text-red-700")}>{msg.text}</p>}
      <section className="space-y-4 rounded-2xl bg-white p-6 shadow-card">
        <div className="grid gap-4 sm:grid-cols-3">
          <label><span className={labelCls}>Date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldCls} /></label>
          <label className="sm:col-span-2"><span className={labelCls}>Narration</span><input value={narration} onChange={(e) => setNarration(e.target.value)} className={fieldCls} /></label>
        </div>
        <div className="space-y-2">
          {lines.map((l) => (
            <div key={l.id} className="grid grid-cols-[1fr_110px_110px_auto] gap-2">
              <select value={l.accountId} onChange={(e) => set(l.id, { accountId: e.target.value })} className={fieldCls}>
                <option value="">— Account —</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
              <input type="number" min={0} step="0.01" placeholder="Debit" value={l.debit} onChange={(e) => set(l.id, { debit: e.target.value, credit: num(e.target.value) > 0 ? "" : l.credit })} className={cn(fieldCls, "text-right")} />
              <input type="number" min={0} step="0.01" placeholder="Credit" value={l.credit} onChange={(e) => set(l.id, { credit: e.target.value, debit: num(e.target.value) > 0 ? "" : l.debit })} className={cn(fieldCls, "text-right")} />
              <button onClick={() => setLines((x) => x.filter((y) => y.id !== l.id))} aria-label="Remove line" className="text-ink-400 hover:text-red-600"><X className="size-4" /></button>
            </div>
          ))}
        </div>
        <button onClick={() => setLines((x) => [...x, { id: Date.now(), accountId: "", debit: "", credit: "" }])} className="inline-flex items-center gap-1 text-sm font-bold text-forest-700"><Plus className="size-4" /> Add line</button>
        <div className={cn("flex justify-between rounded-xl px-4 py-3 text-sm font-bold", debit === credit && debit > 0 ? "bg-lime-100 text-forest-800" : "bg-red-50 text-red-700")}>
          <span>Debit {debit.toFixed(2)} · Credit {credit.toFixed(2)}</span>
          <span>{debit === credit ? (debit > 0 ? "Balanced" : "") : `Not balanced — difference of ${Math.abs(debit - credit).toFixed(2)}`}</span>
        </div>
        <button onClick={submit} disabled={saving || debit !== credit || debit === 0} className="btn-forest rounded-full px-6 py-3 text-sm font-bold disabled:opacity-50">{saving ? "Posting…" : "Post voucher"}</button>
      </section>
    </div>
  );
}
