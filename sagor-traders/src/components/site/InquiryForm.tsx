"use client";

import { useActionState, useEffect, useRef } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { sendInquiry, type InquiryState } from "@/app/actions";
import { cn } from "@/lib/utils";

const field =
  "w-full rounded-xl border border-ink-900/10 bg-white px-5 text-[15px] text-ink-900 placeholder:text-ink-400 outline-none transition focus:border-leaf-500 focus:ring-4 focus:ring-leaf-400/20";

type Props = {
  variant?: "contact" | "product";
  productId?: string;
  productName?: string;
  title?: string;
};

export function InquiryForm({ variant = "contact", productId, productName, title }: Props) {
  const [state, action, pending] = useActionState<InquiryState, FormData>(sendInquiry, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  const err = (k: string) => state?.errors?.[k];

  return (
    <form ref={form} action={action} noValidate className="space-y-4">
      {title && <h3 className="mb-7 text-[26px] font-extrabold tracking-[-0.015em] text-ink-900 sm:text-[29px]">{title}</h3>}
      <input type="hidden" name="kind" value={variant} />
      {productId && <input type="hidden" name="product_id" value={productId} />}
      {productName && <input type="hidden" name="product_name" value={productName} />}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${variant}-name`} className="sr-only">Your name</label>
          <input id={`${variant}-name`} name="name" placeholder="Your Name" autoComplete="name" className={cn(field, "h-[55px]", err("name") && "border-red-400")} aria-invalid={!!err("name")} />
          {err("name") && <p className="mt-1.5 text-xs font-medium text-red-600">{err("name")}</p>}
        </div>
        <div>
          <label htmlFor={`${variant}-contact`} className="sr-only">Phone or email</label>
          <input
            id={`${variant}-contact`}
            name="contact"
            placeholder={variant === "product" ? "Phone Number" : "Your Phone or Email"}
            autoComplete="tel"
            inputMode={variant === "product" ? "tel" : undefined}
            className={cn(field, "h-[55px]", err("contact") && "border-red-400")}
            aria-invalid={!!err("contact")}
          />
          {err("contact") && <p className="mt-1.5 text-xs font-medium text-red-600">{err("contact")}</p>}
        </div>
      </div>

      {variant === "product" && (
        <div className="grid gap-4 sm:grid-cols-3">
          <input name="shop_name" placeholder="Shop Name" className={cn(field, "h-[55px]")} aria-label="Shop name" />
          <input name="area" placeholder="Area / Market" className={cn(field, "h-[55px]")} aria-label="Area or market" />
          <input name="quantity" placeholder="Quantity" className={cn(field, "h-[55px]")} aria-label="Quantity" />
        </div>
      )}

      <div>
        <label htmlFor={`${variant}-message`} className="sr-only">Message</label>
        <textarea
          id={`${variant}-message`}
          name="message"
          rows={variant === "product" ? 3 : 5}
          placeholder={variant === "product" ? "Anything else? (optional)" : "Message"}
          className={cn(field, "resize-none py-4", err("message") && "border-red-400")}
          aria-invalid={!!err("message")}
        />
        {err("message") && <p className="mt-1.5 text-xs font-medium text-red-600">{err("message")}</p>}
      </div>

      <button type="submit" disabled={pending} className="btn-forest flex h-16 w-full items-center justify-center gap-2.5 rounded-2xl text-[16px] font-bold disabled:opacity-70">
        {pending ? <Loader2 className="size-5 animate-spin" /> : null}
        {variant === "product" ? "Send Request" : "Send Message"}
        {!pending && <ArrowRight className="size-[18px]" strokeWidth={2.5} />}
      </button>

      <p role="status" aria-live="polite" className={cn("min-h-5 text-sm font-semibold", state?.ok ? "text-forest-700" : "text-red-600")}>
        {state?.ok && <CheckCircle2 className="mr-1.5 inline size-4 align-[-3px]" />}
        {state?.message}
      </p>
    </form>
  );
}
