"use server";

import { headers } from "next/headers";
import { hasSupabase } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/server";

export type InquiryState = { ok: boolean; message: string; errors?: Record<string, string> } | null;

const recent = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  hits.push(now);
  recent.set(ip, hits);
  return hits.length > 5;
}

const clean = (v: FormDataEntryValue | null, max: number) => {
  const s = typeof v === "string" ? v.trim().replace(/\s+\n/g, "\n") : "";
  return s ? s.slice(0, max) : null;
};

export async function sendInquiry(_prev: InquiryState, form: FormData): Promise<InquiryState> {
  // Bots fill the hidden field; people never see it.
  if (clean(form.get("website"), 200)) return { ok: true, message: "Thank you! We'll be in touch soon." };

  const kind = form.get("kind") === "product" ? "product" : "contact";
  const name = clean(form.get("name"), 120);
  const contact = clean(form.get("contact"), 200);
  const message = clean(form.get("message"), 4000);
  const shop = clean(form.get("shop_name"), 160);
  const area = clean(form.get("area"), 160);
  const quantity = clean(form.get("quantity"), 120);
  const productId = clean(form.get("product_id"), 64);
  const productName = clean(form.get("product_name"), 200);

  const errors: Record<string, string> = {};
  if (!name) errors.name = "Please tell us your name.";
  let email: string | null = null;
  let phone: string | null = null;
  if (!contact) errors.contact = "Add a phone number or email so we can reply.";
  else if (contact.includes("@")) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) errors.contact = "That email doesn't look right.";
    else email = contact.toLowerCase();
  } else {
    const digits = contact.replace(/[^\d+]/g, "");
    if (digits.replace(/\D/g, "").length < 10) errors.contact = "Please enter a full phone number.";
    else phone = contact.slice(0, 40);
  }
  if (kind === "contact" && !message) errors.message = "Please write a short message.";
  if (Object.keys(errors).length) return { ok: false, message: "Please check the highlighted fields.", errors };

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (rateLimited(ip)) return { ok: false, message: "Too many messages in a short time. Please call us instead." };

  if (!hasSupabase) {
    return { ok: true, message: "Thank you! (Demo mode: connect Supabase to start saving messages.)" };
  }

  const { error } = await createPublicClient()
    .from("inquiries")
    .insert({
      kind,
      name,
      email,
      phone,
      message,
      shop_name: shop,
      area,
      quantity,
      product_id: productId && /^[0-9a-f-]{36}$/i.test(productId) ? productId : null,
      product_name: productName,
    });

  if (error) {
    console.error("[inquiry] insert failed", error);
    return { ok: false, message: "Sorry, something went wrong. Please call us or try again." };
  }
  return {
    ok: true,
    message: kind === "product" ? "Request sent! Our sales team will call you shortly." : "Thank you! We'll be in touch soon.",
  };
}
