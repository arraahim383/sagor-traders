import Link from "next/link";
import { Logo, SocialIcon, type SocialKind } from "@/components/decor";
import { BackToTop } from "./BackToTop";
import type { SiteSettings } from "@/lib/types";

const NAV = [
  ["Home", "/#top"],
  ["About", "/#about"],
  ["Products", "/products"],
  ["Our Team", "/#team"],
  ["Contact", "/#contact"],
] as const;

export function Footer({ settings }: { settings: SiteSettings }) {
  const socials = (
    [
      ["facebook", settings.facebook_url, "Facebook"],
      ["twitter", settings.twitter_url, "X (Twitter)"],
      ["youtube", settings.youtube_url, "YouTube"],
      ["linkedin", settings.linkedin_url, "LinkedIn"],
    ] as [SocialKind, string | null, string][]
  ).filter(([, url]) => url);

  return (
    <footer className="relative bg-forest-950 text-white">
      <div className="mx-auto flex max-w-[1240px] flex-col items-center gap-8 px-5 py-12 md:px-8 lg:flex-row lg:justify-between lg:py-14">
        <Link href="/" aria-label={`${settings.company_name} home`} className="text-[2.1rem]">
          <Logo text={settings.logo_text} imageUrl={settings.logo_url} light />
        </Link>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap justify-center gap-x-9 gap-y-3">
            {NAV.map(([label, href]) => (
              <li key={href}>
                <Link href={href} className="text-[15px] font-medium text-white/85 transition hover:text-lime-200">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-4 lg:mr-24">
          {socials.map(([kind, url, label]) => (
            <a
              key={kind}
              href={url!}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="flex size-11 items-center justify-center rounded-full bg-white text-forest-950 transition hover:bg-lime-200"
            >
              <SocialIcon kind={kind} className="size-5" />
            </a>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-[1240px] px-5 py-5 text-center text-xs text-white/55 md:px-8">
          © {new Date().getFullYear()} {settings.company_name}
          {settings.address ? ` · ${settings.address}` : ""}
          {settings.footer_credit ? ` · ${settings.footer_credit}` : ""}
        </p>
      </div>
      <BackToTop />
    </footer>
  );
}
