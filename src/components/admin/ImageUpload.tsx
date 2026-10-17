"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/client";

const MAX = 1600;

/** Shrinks big photos in the browser and converts them to WebP before upload. */
async function shrink(file: File): Promise<Blob> {
  if (file.type === "image/svg+xml") return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process image"))), "image/webp", 0.86));
}

export function ImageUpload({ name, defaultValue, folder }: { name: string; defaultValue?: string | null; folder: string }) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Please choose an image file.");
    setBusy(true);
    setError(null);
    try {
      const blob = await shrink(file);
      const ext = blob.type === "image/svg+xml" ? "svg" : "webp";
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const supabase = getBrowserClient();
      const { error: upErr } = await supabase.storage.from("media").upload(path, blob, { contentType: blob.type, cacheControl: "31536000" });
      if (upErr) throw upErr;
      setUrl(supabase.storage.from("media").getPublicUrl(path).data.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <input type="hidden" name={name} value={url} />
      <div className="flex items-center gap-4">
        <div className="relative flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-ink-900/15 bg-[repeating-conic-gradient(#f4f6f0_0_25%,#fff_0_50%)] bg-[length:16px_16px]">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="size-full object-contain" />
          ) : (
            <ImagePlus className="size-7 text-ink-400" />
          )}
          {busy && (
            <span className="absolute inset-0 flex items-center justify-center bg-white/70">
              <Loader2 className="size-6 animate-spin text-forest-700" />
            </span>
          )}
        </div>
        <div className="flex flex-col items-start gap-2">
          <button type="button" onClick={() => input.current?.click()} className="rounded-xl border border-forest-800 px-4 py-2 text-sm font-bold text-forest-800 hover:bg-forest-800 hover:text-white">
            {url ? "Replace photo" : "Upload photo"}
          </button>
          {url && (
            <button type="button" onClick={() => setUrl("")} className="inline-flex items-center gap-1 text-xs font-bold text-ink-600 hover:text-red-600">
              <X className="size-3.5" /> Remove
            </button>
          )}
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
      </div>
      {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}
