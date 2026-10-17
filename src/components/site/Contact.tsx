import Image from "next/image";
import { Mail, MapPin, Phone } from "lucide-react";
import { Leaf, Swoosh } from "@/components/decor";
import { InquiryForm } from "./InquiryForm";
import type { SiteSettings } from "@/lib/types";
import { formatPhone, telHref } from "@/lib/utils";

function Pill({ href, icon, children }: { href?: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="group flex w-full max-w-[410px] items-center gap-4 rounded-full border-2 border-lime-200/70 bg-forest-950/35 p-1.5 pr-7 text-white backdrop-blur-sm transition hover:border-lime-200 hover:bg-forest-950/55"
    >
      <span className="flex size-[62px] shrink-0 items-center justify-center rounded-full bg-lime-200 text-forest-900 shadow-[0_0_0_6px_rgb(215_236_159/0.18)] sm:size-[70px]">
        {icon}
      </span>
      <span className="min-w-0 truncate text-[18px] font-semibold sm:text-[21px]">{children}</span>
    </a>
  );
}

export function Contact({ settings }: { settings: SiteSettings }) {
  return (
    <section id="contact" className="relative isolate overflow-hidden bg-forest-900">
      <Image
        src={settings.contact_image_url || "/media/site/contact.webp"}
        alt=""
        fill
        sizes="100vw"
        className="-z-20 object-cover object-[20%_50%]"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-forest-950/30 to-forest-950/10 lg:bg-none" />
      <div className="mx-auto grid max-w-[1240px] items-center gap-12 px-5 py-20 md:px-8 lg:min-h-[555px] lg:grid-cols-[1fr_minmax(0,610px)] lg:gap-16 lg:py-14">
        <div>
          <p className="eyebrow text-white">{settings.contact_eyebrow}</p>
          <h2 className="relative mt-4 inline-block text-[clamp(2.8rem,6vw,5.3rem)] font-extrabold leading-[1.05] tracking-[-0.02em] text-white">
            {settings.contact_title}
            <Swoosh tone="lime" className="absolute -bottom-3 left-[12%] h-4 w-[64%]" />
          </h2>
          <div className="mt-11 flex flex-col gap-5">
            {settings.phone && (
              <Pill href={telHref(settings.phone)} icon={<Phone className="size-7" strokeWidth={2.2} fill="currentColor" />}>
                {formatPhone(settings.phone)}
              </Pill>
            )}
            {settings.email && (
              <Pill href={`mailto:${settings.email}`} icon={<Mail className="size-7" strokeWidth={2.3} />}>
                {settings.email}
              </Pill>
            )}
            {settings.address && (
              <p className="flex items-center gap-2 pl-2 text-[15px] font-medium text-white/80">
                <MapPin className="size-4 text-lime-200" /> {settings.address}
              </p>
            )}
          </div>
        </div>

        <div className="relative">
          <Leaf variant="broad" tone="fresh" rotate={-68} className="-left-12 bottom-6 z-10 hidden w-28 lg:block" />
          <div className="relative rounded-[22px] bg-white/[0.97] p-6 shadow-[0_30px_60px_-25px_rgb(0_0_0/0.45)] sm:p-12 sm:pb-8">
            <InquiryForm title="Send us a Message" />
          </div>
        </div>
      </div>
    </section>
  );
}
