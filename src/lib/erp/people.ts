import { round2 } from "./money";

export type IncentiveTier = { min: number; max: number | null; rate: number };

/** Rushda's default DSR payroll policy (each DSR can override). */
export const DEFAULT_PAYROLL_POLICY = {
  basicSalary: 10000,
  dailyAllowance: 100,
  tiers: [
    { min: 600000, max: 800000, rate: 2 },
    { min: 800000, max: 1000000, rate: 3 },
    { min: 1000000, max: null, rate: 3.5 },
  ] as IncentiveTier[],
};

/**
 * Incentive on monthly sales. "slab" = each rate only on the sales inside its band (Rushda shows a per-tier
 * breakdown, which points to this); "flat" = whole month's sales at the highest tier reached.
 */
export function incentive(sales: number, tiers: IncentiveTier[], mode: "slab" | "flat" = "slab") {
  if (mode === "flat") {
    const tier = [...tiers].reverse().find((t) => sales >= t.min);
    return { total: tier ? round2((sales * tier.rate) / 100) : 0, breakdown: tier ? [{ ...tier, base: sales, amount: round2((sales * tier.rate) / 100) }] : [] };
  }
  const breakdown = tiers
    .map((t) => {
      const top = t.max == null ? sales : Math.min(sales, t.max);
      const base = Math.max(0, top - t.min);
      return { ...t, base, amount: round2((base * t.rate) / 100) };
    })
    .filter((b) => b.base > 0);
  return { total: round2(breakdown.reduce((s, b) => s + b.amount, 0)), breakdown };
}

export function dsrPayroll(o: { sales: number; workingDays: number; dailyAllowance: number; basicSalary: number; tiers: IncentiveTier[]; mode?: "slab" | "flat" }) {
  const allowance = round2(o.workingDays * o.dailyAllowance);
  const inc = incentive(o.sales, o.tiers, o.mode);
  const totalEarnings = round2(allowance + inc.total);
  return { allowance, incentive: inc.total, breakdown: inc.breakdown, totalEarnings, grandTotal: round2(totalEarnings + o.basicSalary) };
}

/** SR Target vs Achievement. Achieved = finalized invoice totals for the month; Pending = submitted, not finalized. */
export function targetProgress(target: number, achieved: number, daysLeft: number) {
  const remaining = Math.max(0, round2(target - achieved));
  return {
    percent: target > 0 ? round2((achieved / target) * 100) : null,
    remaining,
    needPerDay: target > 0 && daysLeft > 0 ? round2(remaining / daysLeft) : null,
  };
}

/** Days left in the month counting today (calendar days). */
export function daysLeftInMonth(today: Date) {
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return last - today.getDate() + 1;
}

/** Bad-debt allowance: target = receivables × % (or a fixed amount); adjustment = target − current allowance. */
export function allowanceEstimate(totalReceivables: number, mode: "percent" | "fixed", value: number, currentAllowance: number) {
  const target = mode === "percent" ? totalReceivables * (value / 100) : value;
  return { target: round2(target), adjustment: round2(target - currentAllowance) };
}

/** Product list margin: (sale − buy) / buy, as Rushda shows it (e.g. 355.20 → 372 = 4.73%). */
export const margin = (buy: number, sale: number) => (buy > 0 ? round2(((sale - buy) / buy) * 100) : 0);
