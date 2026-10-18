"use client";

import { useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";

export function PasswordForm() {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (pw.length < 8) return setMsg({ ok: false, text: "Use at least 8 characters." });
        setBusy(true);
        const { error } = await getBrowserClient().auth.updateUser({ password: pw });
        setBusy(false);
        setPw("");
        setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Password updated." });
      }}
      className="mt-4 flex flex-wrap gap-2"
    >
      <input
        type="password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        autoComplete="new-password"
        placeholder="New password"
        aria-label="New password"
        className="h-11 min-w-[220px] flex-1 rounded-xl border border-ink-900/12 px-4 text-sm"
      />
      <button disabled={busy} className="btn-forest h-11 rounded-xl px-5 text-sm font-bold disabled:opacity-70">
        {busy ? "Saving…" : "Update password"}
      </button>
      {msg && <p className={`w-full text-sm font-semibold ${msg.ok ? "text-forest-700" : "text-red-600"}`}>{msg.text}</p>}
    </form>
  );
}
