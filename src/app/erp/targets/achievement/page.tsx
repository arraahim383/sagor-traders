import { TargetsView } from "@/components/erp/TargetsView";

export const metadata = { title: "Target vs achievement" };

export default async function AchievementPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  return <TargetsView sp={await searchParams} view="achievement" />;
}
