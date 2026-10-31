// Rounding exactly as Rushda does it: money to 2 dp, quantities to 3 dp, rates to 4 dp.
export const round2 = (n: number) => Math.round(n * 100) / 100;
export const round3 = (n: number) => Math.round(n * 1000) / 1000;
export const round4 = (n: number) => Math.round(n * 10000) / 10000;

/** Rushda treats differences under half a poisha as zero. */
export const isZero = (n: number) => Math.abs(n) < 0.005;

export const num = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};
export const int = (v: unknown) => {
  const n = typeof v === "number" ? Math.trunc(v) : parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : 0;
};

export const taka = (n: number, dp = 2) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: dp, maximumFractionDigits: dp });
