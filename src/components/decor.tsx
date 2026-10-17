import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

type LeafProps = {
  className?: string;
  style?: CSSProperties;
  variant?: "broad" | "slim" | "round";
  tone?: "fresh" | "deep" | "pale";
  blur?: number;
  rotate?: number;
  sway?: boolean;
};

const tones = {
  fresh: ["#b7dc63", "#6fae36", "#2f7a2b"],
  deep: ["#7fbf47", "#3b8a32", "#1c5a26"],
  pale: ["#d9edb0", "#a7d27a", "#6aa548"],
} as const;

const shapes = {
  broad: "M3 50 C 30 6, 120 -4, 197 48 C 128 104, 36 96, 3 50 Z",
  slim: "M2 50 C 46 24, 140 18, 198 49 C 140 80, 48 76, 2 50 Z",
  round: "M6 50 C 26 4, 132 -2, 194 46 C 150 108, 30 100, 6 50 Z",
};

/** A single decorative leaf, drawn as SVG so it stays sharp at any size. */
export function Leaf({ className, style, variant = "broad", tone = "fresh", blur = 0, rotate = 0, sway }: LeafProps) {
  const [a, b, c] = tones[tone];
  const id = `leaf-${variant}-${tone}`;
  return (
    <svg
      viewBox="0 0 200 100"
      aria-hidden="true"
      className={cn("pointer-events-none absolute select-none", sway && "animate-sway", className)}
      style={{
        ...style,
        ["--r" as string]: `${rotate}deg`,
        transform: sway ? undefined : `rotate(${rotate}deg)`,
        filter: blur ? `blur(${blur}px)` : undefined,
      }}
    >
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="0.55" stopColor={b} />
          <stop offset="1" stopColor={c} />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={shapes[variant]} fill={`url(#${id}-fill)`} />
      <path d={shapes[variant]} fill={`url(#${id}-shine)`} />
      <path d="M6 50 Q 100 44 194 48" stroke="#eaf6c9" strokeOpacity="0.75" strokeWidth="1.6" fill="none" />
      <g stroke="#eaf6c9" strokeOpacity="0.4" strokeWidth="1" fill="none">
        <path d="M40 48 Q 52 30 66 20" />
        <path d="M72 47 Q 86 28 104 16" />
        <path d="M106 46 Q 122 28 140 20" />
        <path d="M140 47 Q 156 34 172 30" />
        <path d="M44 51 Q 58 68 72 78" />
        <path d="M78 51 Q 94 70 110 82" />
        <path d="M112 50 Q 128 66 146 76" />
        <path d="M146 50 Q 160 60 176 64" />
      </g>
    </svg>
  );
}

/** Hand-drawn brush stroke used under highlighted headline words. */
export function Swoosh({ className, tone = "leaf" }: { className?: string; tone?: "leaf" | "lime" }) {
  const colors = tone === "lime" ? ["#c6e57a", "#8fc548"] : ["#7cbf3c", "#3f8f2c"];
  const id = `swoosh-${tone}`;
  return (
    <svg viewBox="0 0 300 30" preserveAspectRatio="none" aria-hidden="true" className={cn("pointer-events-none", className)}>
      <defs>
        <linearGradient id={id} x1="0" x2="1">
          <stop offset="0" stopColor={colors[0]} />
          <stop offset="1" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      <path d="M3 22 C 70 10, 170 4, 292 8 C 296 8.3 297 11 293 11.6 C 190 12, 96 18, 10 28 C 2 29, -1 24, 3 22 Z" fill={`url(#${id})`} />
    </svg>
  );
}

/** Small centred eyebrow with the green bar underneath, as used for Products and Team. */
export function CenteredEyebrow({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className={cn("eyebrow", light ? "text-white" : "text-forest-900")}>{children}</p>
      <span className="h-[6px] w-16 rounded-full bg-gradient-to-r from-leaf-400 to-forest-600" />
    </div>
  );
}

export function Logo({ text, imageUrl, light, className }: { text: string; imageUrl?: string | null; light?: boolean; className?: string }) {
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt={text} className={cn("h-10 w-auto", className)} />;
  }
  const [first, ...rest] = text.split(" ");
  return (
    <span className={cn("relative inline-flex items-center whitespace-nowrap font-script leading-none", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-1/2 aspect-square h-[1.65em] -translate-y-1/2 rounded-full",
          light ? "bg-lime-200/75" : "bg-lime-200/80",
        )}
        style={{ left: `${Math.max(first.length, 4) * 0.42 + 0.35}em` }}
      />
      <span className={cn("relative", light ? "text-white [text-shadow:0_1px_2px_rgb(12_40_23/0.55)]" : "text-ink-900")}>
        {first}
        {rest.length ? " " : ""}
        {rest.join(" ")}
      </span>
    </span>
  );
}

const socialPaths = {
  facebook: "M14 8.5V6.8c0-.8.5-1 .9-1h2.4V2.1L14 2c-3.6 0-4.4 2.7-4.4 4.4v2.1H7.5v3.8h2.1V22h4.3v-9.7h2.9l.4-3.8H14z",
  twitter:
    "M22 5.9c-.7.3-1.5.5-2.4.6.9-.5 1.5-1.3 1.8-2.3-.8.5-1.7.8-2.6 1-1.6-1.7-4.4-1.8-6-.1-1.1 1-1.5 2.6-1.2 4C8.3 8.9 5.2 7.3 3.2 4.8c-1.1 1.9-.5 4.3 1.3 5.5-.7 0-1.3-.2-1.9-.5 0 2 1.4 3.7 3.3 4.1-.6.2-1.2.2-1.9.1.5 1.7 2.1 2.9 3.9 2.9-1.7 1.4-3.9 2.1-6.1 1.8 1.9 1.2 4.1 1.9 6.4 1.9 7.7 0 11.9-6.4 11.9-11.9v-.5c.8-.6 1.5-1.3 2-2.2z",
  youtube:
    "M21.6 7.2c-.2-.9-.9-1.6-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4c-.9.2-1.6.9-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8c.2.9.9 1.6 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8zM10 15V9l5.2 3L10 15z",
  linkedin:
    "M6.9 21H3.3V9h3.6v12zM5.1 7.4C3.9 7.4 3 6.5 3 5.3S3.9 3.2 5.1 3.2s2.1.9 2.1 2.1-1 2.1-2.1 2.1zM21 21h-3.6v-5.8c0-1.4 0-3.2-1.9-3.2-2 0-2.3 1.5-2.3 3.1V21H9.6V9H13v1.6h.1c.5-.9 1.7-1.9 3.4-1.9 3.7 0 4.4 2.4 4.4 5.5V21z",
};

export type SocialKind = keyof typeof socialPaths;

export function SocialIcon({ kind, className }: { kind: SocialKind; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d={socialPaths[kind]} />
    </svg>
  );
}
