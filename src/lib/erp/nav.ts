// The business section's menu, grouped like Rushda's sidebar.
export type NavGroup = { key: string; label: string; links: { href: string; label: string }[] };

export const BUSINESS_NAV: NavGroup[] = [
  { key: "home", label: "Overview", links: [{ href: "/admin/business", label: "Dashboard" }] },
  {
    key: "sales",
    label: "Sales",
    links: [
      { href: "/admin/business/sales/new", label: "New order" },
      { href: "/admin/business/sales", label: "Sales history" },
      { href: "/admin/business/reminders", label: "Reminders" },
    ],
  },
  {
    key: "purchase",
    label: "Purchase",
    links: [
      { href: "/admin/business/purchase/new", label: "New PO" },
      { href: "/admin/business/purchase", label: "PO list" },
      { href: "/admin/business/receive/new", label: "Goods receive" },
      { href: "/admin/business/receive", label: "Receive notes" },
    ],
  },
  {
    key: "stock",
    label: "Stock",
    links: [
      { href: "/admin/business/stock", label: "Stock" },
      { href: "/admin/business/stock/adjust", label: "Adjust & damage" },
      { href: "/admin/business/claims", label: "Claims" },
    ],
  },
  {
    key: "money",
    label: "Payments",
    links: [
      { href: "/admin/business/payments/new", label: "Receive / pay" },
      { href: "/admin/business/payments", label: "Payment list" },
      { href: "/admin/business/cashbook", label: "Cash book" },
    ],
  },
  {
    key: "accounts",
    label: "Accounts",
    links: [
      { href: "/admin/business/accounts", label: "Chart & balances" },
      { href: "/admin/business/accounts/voucher", label: "Journal voucher" },
      { href: "/admin/business/accounts/journal", label: "Journal book" },
      { href: "/admin/business/bad-debts", label: "Bad debts" },
    ],
  },
  {
    key: "people",
    label: "People",
    links: [
      { href: "/admin/business/m/retailers", label: "Retailers" },
      { href: "/admin/business/m/routes", label: "Routes" },
      { href: "/admin/business/m/suppliers", label: "Suppliers" },
      { href: "/admin/business/m/staff", label: "SR, DSR & staff" },
      { href: "/admin/business/targets", label: "SR targets" },
    ],
  },
  {
    key: "staff",
    label: "Staff",
    links: [
      { href: "/admin/business/staff/attendance", label: "Attendance" },
      { href: "/admin/business/staff/leave", label: "Leave" },
      { href: "/admin/business/staff/salary", label: "Salary" },
      { href: "/admin/business/staff/payroll", label: "DSR payroll" },
    ],
  },
  {
    key: "catalog",
    label: "Products",
    links: [
      { href: "/admin/business/m/products", label: "Products" },
      { href: "/admin/business/m/categories", label: "Categories" },
      { href: "/admin/business/m/promotions", label: "Promotions" },
      { href: "/admin/business/m/cash-categories", label: "Expense categories" },
    ],
  },
  { key: "reports", label: "Reports", links: [{ href: "/admin/business/reports", label: "All reports" }] },
];

export function groupFor(path: string) {
  let best: { g: NavGroup; len: number } | null = null;
  for (const g of BUSINESS_NAV)
    for (const l of g.links)
      if ((path === l.href || path.startsWith(l.href + "/")) && (!best || l.href.length > best.len)) best = { g, len: l.href.length };
  return best?.g ?? BUSINESS_NAV[0];
}
