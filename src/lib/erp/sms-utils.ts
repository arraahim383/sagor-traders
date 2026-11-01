// Pure helpers for SMS: number clean-up, the provider URL template and due-reminder text.

export type SmsConfig = { username: string; password: string; cli: string; sendUrl: string; balanceUrl: string; billMsisdn: string };

/** Bangladeshi mobile → 8801XXXXXXXXX, or null when it isn't one. Accepts 01…, +8801…, 8801…, with spaces or dashes. */
export function normalizeBdMobile(raw: string): string | null {
  const d = raw.replace(/[^\d]/g, "");
  const local = d.startsWith("880") ? d.slice(2) : d.startsWith("88") ? d.slice(2) : d;
  return /^01[3-9]\d{8}$/.test(local) ? `88${local}` : null;
}

/** Split a pasted list (commas, spaces, new lines) into unique valid numbers, plus the ones that were rejected. */
export function parseNumbers(text: string) {
  const ok = new Set<string>();
  const bad: string[] = [];
  for (const part of text.split(/[\s,;]+/).filter(Boolean)) {
    const n = normalizeBdMobile(part);
    if (n) ok.add(n);
    else bad.push(part);
  }
  return { numbers: [...ok], rejected: bad };
}

/**
 * Fill the provider's URL template. Placeholders: {user} {pass} {cli} {to} {msg} {bill}.
 * Values are URL-encoded, so the template works for any GET-style SMS gateway (Banglalink corporate SMS included).
 */
export function fillTemplate(template: string, cfg: SmsConfig, to = "", msg = "") {
  const vals: Record<string, string> = { user: cfg.username, pass: cfg.password, cli: cfg.cli, to, msg, bill: cfg.billMsisdn };
  return template.replace(/\{(user|pass|cli|to|msg|bill)\}/g, (_, k: string) => encodeURIComponent(vals[k] ?? ""));
}

/** Due reminder text: {name} {due} {company} are replaced; the amount is shown as whole taka with commas. */
export function renderDueMessage(template: string, v: { name: string; due: number; company: string }) {
  const due = Math.round(v.due).toLocaleString("en-IN");
  return template.replace(/\{name\}/g, v.name).replace(/\{due\}/g, due).replace(/\{company\}/g, v.company);
}

/** SMS parts: 160 chars per part in plain text, 70 when the message has Bangla or other non-GSM text (153 / 67 when split). */
export function smsParts(text: string) {
  const unicode = /[^\x00-\x7F]/.test(text);
  const single = unicode ? 70 : 160;
  const multi = unicode ? 67 : 153;
  return text.length === 0 ? 0 : text.length <= single ? 1 : Math.ceil(text.length / multi);
}
