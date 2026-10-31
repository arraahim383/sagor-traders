"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import type { CashAccount } from "@/lib/erp/accounting";
import { num } from "@/lib/erp/money";
import type { PostResult } from "@/lib/erp/purchase-payload";
import { cn } from "@/lib/utils";
import { fieldCls, labelCls } from "./ui";

export type PayParty = { id: number; name: string; balance: number };
export type PayInput = { date: string; partyType: PartyType; partyId: number; amount: number; less: number; account: CashAccount; mode: string; refInvoice: string; remark: string };
type PartyType = "retailer" | "sr" | "dsr" | "supplier" | "staff";

const TABS: { key: PartyType; label: string; dir: "in" | "out" }[] = [
  { key: "retailer", label: "Retailer", dir: "in" },
  { key: "sr", label: "SR", dir: "in" },
  { key: "dsr", label: "DSR", dir: "in" },
  { key: "supplier", label: "Supplier", dir: "out" },
  { key: "staff", label: "Staff salary", dir: "out" },
];
const ACCOUNTS: { key: CashAccount; label: string }[] = [
  { key: "cash", label: "Cash" },
  { key: "bank", label: "Bank" },
  { key: "bkash", label: "bKash-01777940795" },
  { key: "nagad", label: "Nagad-01777940795" },
];
const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function PaymentForm({
  parties,
  dues,
  onSave,
  initialType = "retailer",
}: {
  parties: Record<PartyType, PayParty[]>;
  dues: { partyType: PartyType; partyId: number; invoice: string; due: number }[];
  onSave: (i: PayInput) => Promise<PostResult>;
  initialType?: PartyType;
}) {
  const [type, setType] = useState<PartyType>(initialType);
  const [partyText, setPartyText] = useState("");
  const [date, setDate] = useState(() => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date()));
  const [amount, setAmount] = useState("");
  const [less, setLess] = useState("");
  const [account, setAccount] = useState<CashAccount>("cash");
  const [mode, setMode] = useState("Cash");
  const [ref, setRef] = useState("");
  const [remark, setRemark] = useState("");
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [saving, start] = useTransition();

  const tab = TABS.find((t) => t.key === type)!;
  const list = parties[type];
  const party = useMemo(() => list.find((p) => p.name === partyText), [list, partyText]);
  // Ledger balance is debit-positive: what retailers/SR/DSR owe us; suppliers/staff show as what we owe them.
  const shown = party ? (tab.dir === "out" ? -party.balance : party.balance) : 0;
  const openDues = dues.filter((d) => d.partyType === type && d.partyId === party?.id);

  function submit() {
    if (!party) return setMsg({ tone: "error", text: `Pick a ${tab.label.toLowerCase()} from the list.` });
    if (num(amount) <= 0 && num(less) <= 0) return setMsg({ tone: "error", text: "Enter an amount." });
    start(async () => {
      const res = await onSave({ date, partyType: type, partyId: party.id, amount: num(amount), less: num(less), account, mode, refInvoice: ref, remark });
      if (!res.ok) return setMsg({ tone: "error", text: res.error });
      setMsg({ tone: "ok", text: `${res.number} saved — ${tab.dir === "in" ? "received from" : "paid to"} ${party.name}: ${fmt(num(amount))}.` });
      setAmount("");
      setLess("");
      setRef("");
      setRemark("");
      setPartyText("");
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-leaf-600">Payments</p>
        <h1 className="text-3xl font-extrabold tracking-[-0.02em] text-forest-900">{tab.dir === "in" ? "Receive money" : "Make a payment"}</h1>
      </div>
      <div className="no-scrollbar mb-5 flex gap-1.5 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => { setType(t.key); setPartyText(""); setRef(""); }} className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-bold", t.key === type ? "bg-forest-900 text-white" : "bg-white text-ink-600 shadow-card")}>
            {t.label}
          </button>
        ))}
      </div>
      {msg && (
        <p role={msg.tone === "error" ? "alert" : "status"} className={cn("mb-5 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold", msg.tone === "ok" ? "bg-lime-100 text-forest-800" : "bg-red-50 text-red-700")}>
          {msg.tone === "ok" && <CheckCircle2 className="size-4" />} {msg.text}
        </p>
      )}
      <section className="grid gap-4 rounded-2xl bg-white p-6 shadow-card sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className={labelCls}>{tab.label} (type to search)</span>
          <input list={`parties-${type}`} value={partyText} onChange={(e) => setPartyText(e.target.value)} placeholder={`Search ${tab.label.toLowerCase()}…`} className={fieldCls} />
          <datalist id={`parties-${type}`}>{list.map((p) => <option key={p.id} value={p.name} />)}</datalist>
        </label>
        {party && (
          <p className={cn("rounded-xl px-4 py-3 text-sm font-bold sm:col-span-2", shown > 0.005 ? "bg-red-50 text-red-700" : "bg-mint-50 text-forest-800")}>
            {tab.dir === "in" ? "Owes us" : "We owe"}: {fmt(shown)}
          </p>
        )}
        {tab.dir === "in" && (
          <label className="sm:col-span-2">
            <span className={labelCls}>Reference invoice (optional — select a due invoice to clear it)</span>
            <select value={ref} onChange={(e) => { setRef(e.target.value); const d = openDues.find((x) => x.invoice === e.target.value); if (d) setAmount(String(d.due)); }} className={fieldCls}>
              <option value="">— No specific invoice —</option>
              {openDues.map((d) => <option key={d.invoice} value={d.invoice}>{d.invoice} — due {fmt(d.due)}</option>)}
            </select>
          </label>
        )}
        <label><span className={labelCls}>{tab.dir === "in" ? "Amount received" : "Amount paid"}</span><input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={cn(fieldCls, "text-right")} /></label>
        <label><span className={labelCls}>Less (settlement discount)</span><input type="number" min={0} step="0.01" value={less} placeholder="0" onChange={(e) => setLess(e.target.value)} className={cn(fieldCls, "text-right")} /></label>
        <label><span className={labelCls}>Date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldCls} /></label>
        <label><span className={labelCls}>Account</span><select value={account} onChange={(e) => setAccount(e.target.value as CashAccount)} className={fieldCls}>{ACCOUNTS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}</select></label>
        <label><span className={labelCls}>Mode</span><select value={mode} onChange={(e) => setMode(e.target.value)} className={fieldCls}>{["Cash", "Bank Transfer", "Mobile Banking"].map((m) => <option key={m}>{m}</option>)}</select></label>
        <label><span className={labelCls}>Remark</span><input value={remark} onChange={(e) => setRemark(e.target.value)} className={fieldCls} /></label>
        {party && (
          <p className="text-sm text-ink-600 sm:col-span-2">
            Balance after this: <b>{fmt(tab.dir === "in" ? shown - num(amount) - num(less) : shown - num(amount) - num(less))}</b>
          </p>
        )}
        <button onClick={submit} disabled={saving} className="btn-forest rounded-full px-4 py-3 text-sm font-bold disabled:opacity-50 sm:col-span-2">
          {saving ? "Saving…" : tab.dir === "in" ? "Save receipt" : "Save payment"}
        </button>
      </section>
    </div>
  );
}
