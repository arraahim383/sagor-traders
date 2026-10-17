import Link from "next/link";

export default function NotFound() {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center bg-gradient-to-b from-[#e3eef3] to-cream-50 px-5 pt-24 text-center">
      <p className="eyebrow text-leaf-600">Not found</p>
      <h1 className="mt-3 text-4xl font-extrabold text-forest-900">We couldn&apos;t find that page</h1>
      <p className="mt-3 text-ink-600">It may have moved. Try our products or go back home.</p>
      <div className="mt-7 flex gap-3">
        <Link href="/" className="btn-forest rounded-full px-6 py-3 font-bold">Home</Link>
        <Link href="/products" className="rounded-full border-2 border-forest-800 px-6 py-[10px] font-bold text-forest-800">Products</Link>
      </div>
    </section>
  );
}
