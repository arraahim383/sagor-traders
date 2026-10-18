"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { MessageCircle, Phone, X } from "lucide-react";
import type { TeamMember } from "@/lib/types";
import { cn, formatPhone, telHref, whatsappNumber } from "@/lib/utils";

/** Rows alternate 5 and 6 cards on large screens, matching the design. */
function chunk<T>(items: T[]) {
  const rows: T[][] = [];
  let i = 0;
  let size = 5;
  while (i < items.length) {
    rows.push(items.slice(i, i + size));
    i += size;
    size = size === 5 ? 6 : 5;
  }
  return rows;
}

function Card({ m, onOpen, compact }: { m: TeamMember; onOpen: (m: TeamMember) => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(m)}
      className="group flex h-full w-full flex-col overflow-hidden rounded-2xl bg-white text-left shadow-card ring-1 ring-forest-900/5 transition-transform duration-300 hover:-translate-y-1"
      aria-label={`${m.name}${m.role ? `, ${m.role}` : ""}. Show contact details`}
    >
      <span className="relative block aspect-[1.19] w-full overflow-hidden bg-mint-50">
        {m.photo_url && (
          <Image
            src={m.photo_url}
            alt=""
            fill
            sizes={compact ? "(min-width:1024px) 200px, 45vw" : "(min-width:1024px) 240px, 45vw"}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
      </span>
      <span className="flex min-h-[64px] flex-1 items-center justify-center px-3 py-3 text-center text-[14px] font-bold leading-snug text-ink-900 sm:text-[16px]">
        {m.name}
      </span>
    </button>
  );
}

export function TeamGrid({ members }: { members: TeamMember[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [current, setCurrent] = useState<TeamMember | null>(null);
  const open = (m: TeamMember) => {
    setCurrent(m);
    dialog.current?.showModal();
  };
  const wa = whatsappNumber(current?.phone);

  return (
    <>
      <div className="hidden flex-col items-center gap-7 lg:flex">
        {chunk(members).map((row, r) => (
          <ul
            key={r}
            className={cn("grid w-full gap-7", row.length >= 6 ? "max-w-[1316px] grid-cols-6" : "max-w-[1268px] grid-cols-5")}
          >
            {row.map((m) => (
              <li key={m.id}>
                <Card m={m} onOpen={open} compact={row.length >= 6} />
              </li>
            ))}
          </ul>
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:hidden">
        {members.map((m) => (
          <li key={m.id}>
            <Card m={m} onOpen={open} />
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        onClose={() => setCurrent(null)}
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        className="m-auto w-[min(92vw,420px)] overflow-hidden rounded-3xl bg-white p-0 shadow-2xl backdrop:bg-forest-950/60 backdrop:backdrop-blur-sm"
      >
        {current && (
          <div>
            <div className="relative aspect-[1.19] bg-mint-50">
              {current.photo_url && <Image src={current.photo_url} alt={current.name} fill sizes="420px" className="object-cover" />}
              <button
                type="button"
                onClick={() => dialog.current?.close()}
                className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-full bg-white/90 text-ink-900 shadow"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-extrabold text-forest-900">{current.name}</h3>
              {current.role && <p className="mt-1 text-[15px] font-medium text-ink-600">{current.role}</p>}
              {current.phone ? (
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <a href={telHref(current.phone)} className="btn-forest flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-bold">
                    <Phone className="size-4" /> {formatPhone(current.phone)}
                  </a>
                  {wa && (
                    <a
                      href={`https://wa.me/${wa}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 rounded-full bg-[#25d366] px-4 py-3 text-sm font-bold text-white transition hover:brightness-105"
                    >
                      <MessageCircle className="size-4" /> WhatsApp
                    </a>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-sm text-ink-600">Reach this team member through the main contact number.</p>
              )}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
