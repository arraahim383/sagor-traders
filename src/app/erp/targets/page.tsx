import { TargetsView } from "@/components/erp/TargetsView";

export const metadata = { title: "SR monthly target" };

export default async function TargetsPage({ searchParams }: { searchParams: Promise<{ month?: string; saved?: string; error?: string }> }) {
  return <TargetsView sp={await searchParams} view="set" />;
}
