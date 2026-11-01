// Every report in Rushda's Report Center, grouped. `href` reports live on their own screen already.
export type ReportFilter = "range" | "date" | "month" | "asOf" | "none";
export type PartyType = "retailer" | "sr" | "dsr" | "supplier";
export type ReportDef = { key: string; label: string; group: string; filter?: ReportFilter; party?: PartyType; href?: string; note?: string; extra?: ("sr" | "route")[] };

export const REPORT_GROUPS = ["Sales", "Profit", "Purchase", "Stock", "Parties", "Accounts", "Staff"] as const;

export const REPORTS: ReportDef[] = [
  { key: "daily-sales", label: "Daily sales", group: "Sales" },
  { key: "dsr-sales", label: "DSR wise sales", group: "Sales" },
  { key: "sr-sales", label: "SR wise sales", group: "Sales" },
  { key: "route-sales", label: "Route wise sales", group: "Sales" },
  { key: "retailer-sales", label: "Retailer wise sales", group: "Sales" },
  { key: "product-sales", label: "Product wise sales", group: "Sales" },
  { key: "sales-items", label: "Sales summary (item wise)", group: "Sales", extra: ["sr", "route"] },
  { key: "sales-summary", label: "Sales summary (deductions)", group: "Sales" },
  { key: "rate-diff", label: "Over / under rate", group: "Sales" },
  { key: "sr-target", label: "SR target vs achievement", group: "Sales", href: "/erp/targets/achievement" },

  { key: "invoice-profit", label: "Invoice wise profit", group: "Profit" },
  { key: "product-profit", label: "Product wise profit", group: "Profit" },
  { key: "category-profit", label: "Brand (category) wise profit", group: "Profit" },
  { key: "supplier-profit", label: "Supplier wise profit", group: "Profit" },
  { key: "profit-loss", label: "Profit & loss", group: "Profit" },

  { key: "grn-notes", label: "Goods receive notes", group: "Purchase" },
  { key: "grn-products", label: "Goods receive products", group: "Purchase" },
  { key: "product-receive", label: "Product wise receive", group: "Purchase" },
  { key: "category-receive", label: "Category wise receive", group: "Purchase" },
  { key: "grn-summary", label: "Goods receive summary", group: "Purchase" },
  { key: "po-vs-grn", label: "PO vs goods receive", group: "Purchase" },

  { key: "stock-value", label: "Stock & stock value", group: "Stock", filter: "none" },
  { key: "low-stock", label: "Low stock", group: "Stock", filter: "none" },
  { key: "free-stock", label: "Free stock", group: "Stock", filter: "none" },
  { key: "damage-stock", label: "Damaged, not yet claimed", group: "Stock", filter: "none" },
  { key: "stock-card", label: "Stock card", group: "Stock", href: "/erp/stock", note: "Open a product to see its card" },

  { key: "retailer-statement", label: "Retailer statement", group: "Parties", party: "retailer" },
  { key: "retailer-balance", label: "Retailer balance", group: "Parties" },
  { key: "sr-statement", label: "SR statement", group: "Parties", party: "sr" },
  { key: "sr-balance", label: "SR balance", group: "Parties" },
  { key: "dsr-statement", label: "DSR statement", group: "Parties", party: "dsr" },
  { key: "dsr-balance", label: "DSR balance", group: "Parties" },
  { key: "supplier-statement", label: "Supplier statement", group: "Parties", party: "supplier" },
  { key: "supplier-balance", label: "Supplier balance", group: "Parties" },

  { key: "day-book", label: "Day book", group: "Accounts", filter: "date" },
  { key: "trial-balance", label: "Trial balance", group: "Accounts" },
  { key: "balance-sheet", label: "Balance sheet", group: "Accounts", filter: "asOf" },
  { key: "expense-report", label: "Expense report", group: "Accounts" },
  { key: "journal", label: "Journal book", group: "Accounts", href: "/erp/accounts/journal" },
  { key: "ledger", label: "Ledger", group: "Accounts", href: "/erp/accounts/ledger" },
  { key: "bad-debts", label: "Bad debts / allowance", group: "Accounts", href: "/erp/bad-debts" },

  { key: "salary-sheet", label: "Salary sheet", group: "Staff", filter: "month" },
  { key: "attendance-sheet", label: "Attendance sheet", group: "Staff", filter: "month" },
  { key: "dsr-payroll", label: "DSR payroll", group: "Staff", href: "/erp/staff/payroll" },
];

export const reportHref = (r: ReportDef) => r.href ?? `/erp/reports/${r.key}`;
export const findReport = (key: string) => REPORTS.find((r) => r.key === key && !r.href);

/** Margin % on revenue, 1 dp, as in Rushda's profit reports. */
export const marginPct = (profit: number, revenue: number) => (revenue ? Math.round((profit / revenue) * 1000) / 10 : 0);
/** Average price = amount ÷ qty (0 when nothing moved). */
export const avgPrice = (amount: number, qty: number) => (qty ? amount / qty : 0);
