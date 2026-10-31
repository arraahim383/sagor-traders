import { notFound } from "next/navigation";
import { SalesOrderForm } from "@/components/erp/SalesOrderForm";
import { previewDsrs, previewProducts, previewRetailers, previewSrs } from "@/lib/erp/preview-data";

// Local-only preview of the business screens without signing in; never served in production.
export const metadata = { title: "Business preview", robots: { index: false } };

export default function ErpPreviewPage() {
  if (process.env.NODE_ENV === "production" && !process.env.ERP_PREVIEW) notFound();
  return (
    <main className="min-h-screen bg-cream-50 px-5 pb-20 pt-6 md:px-10 lg:pt-10">
      <SalesOrderForm products={previewProducts} srs={previewSrs} dsrs={previewDsrs} retailers={previewRetailers} />
    </main>
  );
}
