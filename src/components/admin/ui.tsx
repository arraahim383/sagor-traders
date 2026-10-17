"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2, Trash2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function SubmitButton({ children, className }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={cn("btn-forest inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-bold disabled:opacity-70", className)}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

/** Two-step delete so nothing disappears on a mis-tap. */
export function DeleteButton({ action, label = "Delete" }: { action: () => Promise<void>; label?: string }) {
  const [armed, setArmed] = useState(false);
  return (
    <form action={action} className="inline">
      {armed ? (
        <span className="inline-flex items-center gap-1">
          <ConfirmButton />
          <button type="button" onClick={() => setArmed(false)} className="rounded-lg px-2 py-1.5 text-xs font-bold text-ink-600 hover:bg-ink-900/5">
            Cancel
          </button>
        </span>
      ) : (
        <button type="button" onClick={() => setArmed(true)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50" aria-label={label}>
          <Trash2 className="size-3.5" /> {label}
        </button>
      )}
    </form>
  );
}

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-bold text-white">
      {pending ? "Deleting…" : "Yes, delete"}
    </button>
  );
}

export function Flash({ saved, deleted, error }: { saved?: string; deleted?: string; error?: string }) {
  if (error)
    return (
      <p role="alert" className="mb-6 flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
        <TriangleAlert className="size-4" /> {error}
      </p>
    );
  if (saved || deleted)
    return (
      <p role="status" className="mb-6 flex items-center gap-2 rounded-2xl bg-mint-50 px-4 py-3 text-sm font-semibold text-forest-800">
        <CheckCircle2 className="size-4" /> {deleted ? "Deleted." : "Saved. The website is updated."}
      </p>
    );
  return null;
}
