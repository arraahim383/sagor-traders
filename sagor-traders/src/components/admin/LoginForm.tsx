"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/client";

const input =
  "h-12 w-full rounded-xl border border-ink-900/10 bg-white px-4 text-[15px] outline-none focus:border-leaf-500 focus:ring-4 focus:ring-leaf-400/20";

export function LoginForm({ initialError }: { initialError?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(initialError ? { ok: false, text: initialError } : null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const supabase = getBrowserClient();
    const redirectTo = `${window.location.origin}/auth/callback`;
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace("/admin");
        router.refresh();
        return;
      }
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
        if (error) throw error;
        if (data.session) {
          router.replace("/admin");
          router.refresh();
          return;
        }
        setMsg({ ok: true, text: "Account created. Check your inbox and click the confirmation link, then sign in." });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${redirectTo}?next=/admin/account` });
        if (error) throw error;
        setMsg({ ok: true, text: "If that email has an account, a reset link is on its way." });
      }
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-bold">Email</label>
        <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
      </div>
      {mode !== "reset" && (
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-bold">Password</label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
          />
        </div>
      )}
      <button type="submit" disabled={busy} className="btn-forest flex h-12 w-full items-center justify-center gap-2 rounded-xl font-bold disabled:opacity-70">
        {busy && <Loader2 className="size-4 animate-spin" />}
        {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
      </button>
      {msg && <p className={`rounded-xl p-3 text-sm font-medium ${msg.ok ? "bg-mint-50 text-forest-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}
      <div className="flex flex-wrap justify-between gap-2 pt-2 text-sm font-semibold">
        {mode !== "signin" ? (
          <button type="button" onClick={() => setMode("signin")} className="text-forest-700 hover:underline">Back to sign in</button>
        ) : (
          <button type="button" onClick={() => setMode("signup")} className="text-forest-700 hover:underline">First time? Create an account</button>
        )}
        {mode === "signin" && (
          <button type="button" onClick={() => setMode("reset")} className="text-ink-600 hover:underline">Forgot password?</button>
        )}
      </div>
    </form>
  );
}
