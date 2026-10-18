import type { Metadata, Viewport } from "next";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource/great-vibes";
import "./globals.css";
import { getSettings } from "@/lib/data";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const title = s.seo_title || s.company_name;
  const description = s.seo_description || undefined;
  return {
    metadataBase: new URL(siteUrl),
    title: { default: title, template: `%s | ${s.company_name}` },
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: s.company_name,
      images: [{ url: s.hero_image_url || "/media/site/hero.webp", width: 2400, height: 1462 }],
    },
    icons: { icon: "/icon.svg" },
  };
}

export const viewport: Viewport = {
  themeColor: "#12341f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
