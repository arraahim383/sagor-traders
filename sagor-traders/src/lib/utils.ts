export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function slugify(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Digits only, Bangladesh numbers normalised to start with 880 for wa.me links. */
export function whatsappNumber(raw: string | null | undefined) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0")) return `88${digits}`;
  return digits;
}

export function telHref(raw: string | null | undefined) {
  if (!raw) return undefined;
  return `tel:${raw.replace(/[^\d+]/g, "")}`;
}

export function formatPhone(raw: string | null | undefined) {
  if (!raw) return "";
  const d = raw.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("01")) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return raw;
}

/** Splits a headline so the highlighted words can be underlined. */
export function splitHighlight(title: string, highlight: string | null | undefined) {
  if (!highlight) return { before: title, mark: "", after: "" };
  const i = title.toLowerCase().lastIndexOf(highlight.toLowerCase());
  if (i < 0) return { before: title, mark: "", after: "" };
  return { before: title.slice(0, i), mark: title.slice(i, i + highlight.length), after: title.slice(i + highlight.length) };
}
