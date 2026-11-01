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
    expect(reportHref(REPORTS.find((r) => r.key === "journal")!)).toBe("/erp/accounts/journal");
  });
});

describe("ERP menu", () => {
  it("maps pages to modules and finds the active link", async () => {
    const { moduleFor, activeHref, canOpen } = await import("./nav");
    expect(moduleFor("/erp/sales/sr")).toBe("sales");
    expect(moduleFor("/erp/m/staff/12")).toBe("staff");
    expect(moduleFor("/erp/m/retailers")).toBe("people");
    expect(moduleFor("/erp/setup/users")).toBe("setup");
    expect(moduleFor("/erp")).toBe("home");
    expect(activeHref("/erp/sales", new URLSearchParams("status=draft"))).toBe("/erp/sales?status=draft");
    expect(activeHref("/erp/sales", new URLSearchParams())).toBe("/erp/sales");
    expect(activeHref("/erp/sales/12/edit", new URLSearchParams())).toBe("/erp/sales");
    expect(activeHref("/erp/payments/new", new URLSearchParams("type=sr"))).toBe("/erp/payments/new?type=sr");
    expect(canOpen(null, "setup")).toBe(true);
    expect(canOpen(["sales"], "accounts")).toBe(false);
    expect(canOpen([], "home")).toBe(true);
  });
});
