import { BusinessNav } from "@/components/erp/BusinessNav";

export const dynamic = "force-dynamic";

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BusinessNav />
      {children}
    </>
  );
}
