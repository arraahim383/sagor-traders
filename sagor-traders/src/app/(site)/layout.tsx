import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getSettings } from "@/lib/data";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <>
      <a href="#main" className="sr-only z-[60] rounded-lg bg-white px-4 py-2 font-semibold focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <Header logoText={settings.logo_text} logoUrl={settings.logo_url} />
      <main id="main">{children}</main>
      <Footer settings={settings} />
    </>
  );
}
