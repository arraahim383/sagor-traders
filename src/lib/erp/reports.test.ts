import { describe, expect, it } from "vitest";
import { REPORTS, avgPrice, findReport, marginPct, reportHref } from "./reports";

describe("report formulas", () => {
  it("margin % is profit over revenue to 1 dp", () => {
    expect(marginPct(85, 1790)).toBe(4.7);
    expect(marginPct(-50, 1000)).toBe(-5);
    expect(marginPct(10, 0)).toBe(0);
  });

  it("average price is amount over qty", () => {
    expect(avgPrice(1790, 10)).toBe(179);
    expect(avgPrice(100, 0)).toBe(0);
  });
});

describe("report registry", () => {
  it("has unique keys and every Rushda report", () => {
    const keys = REPORTS.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(REPORTS.length).toBeGreaterThanOrEqual(37);
  });

  it("only screen reports resolve on the report route", () => {
    expect(findReport("trial-balance")?.label).toBe("Trial balance");
    expect(findReport("journal")).toBeUndefined();
    expect(reportHref(REPORTS.find((r) => r.key === "journal")!)).toBe("/admin/business/accounts/journal");
  });
});
