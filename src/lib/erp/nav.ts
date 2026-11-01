// The ERP menu, one group per Rushda sidebar heading. Group keys double as permission modules.
export type NavLink = { href: string; label: string };
export type NavGroup = { key: string; label: string; links: NavLink[] };

export const BUSINESS_NAV: NavGroup[] = [
  { key: "home", label: "Dashboard", links: [{ href: "/erp", label: "Dashboard" }] },
  {
    key: "products",
    label: "Products",
    links: [
      { href: "/erp/m/products", label: "Product list" },
      { href: "/erp/m/products/new", label: "Add product" },
      { href: "/erp/m/categories", label: "Categories" },
      { href: "/erp/m/promotions", label: "Promotional offers" },
    ],
  },
  {
    key: "purchase",
    label: "Purchase Order",
    links: [
      { href: "/erp/purchase/new", label: "Create PO" },
      { href: "/erp/purchase", label: "PO list" },
    ],
  },
  {
    key: "receive",
    label: "Goods Receive",
    links: [
      { href: "/erp/receive/new", label: "Goods receive" },
      { href: "/erp/receive", label: "Receive notes" },
    ],
  },
  {
    key: "sales",
    label: "Sales & Order",
    links: [
      { href: "/erp/sales/new", label: "New sales order" },
      { href: "/erp/sales?status=draft", label: "Draft invoices" },
      { href: "/erp/sales", label: "Sales list" },
      { href: "/erp/sales/sr", label: "SR sales create" },
      { href: "/erp/sales/sr-orders", label: "SR sales orders" },
      { href: "/erp/sales/delivery", label: "Delivery pending" },
      { href: "/erp/reminders", label: "Reminders" },
      { href: "/erp/reports/rate-diff", label: "Over / under rate" },
      { href: "/erp/reports/sales-items", label: "Sales summary" },
    ],
  },
  {
    key: "stock",
    label: "Stock",
    links: [
      { href: "/erp/stock", label: "Supplier stock" },
      { href: "/erp/reports/low-stock", label: "Low stock" },
      { href: "/erp/stock/adjust", label: "Stock adjust" },
      { href: "/erp/claims?kind=Damage", label: "Damage claim" },
      { href: "/erp/claims/list", label: "Claim send list" },
      { href: "/erp/stock/adjust?mode=recover", label: "Damage recover" },
    ],
  },
  {
    key: "payments",
    label: "Payments",
    links: [
      { href: "/erp/payments", label: "Payment list" },
      { href: "/erp/payments/new?type=dsr", label: "DSR payment" },
      { href: "/erp/payments/new?type=sr", label: "SR payment" },
      { href: "/erp/payments/new?type=retailer", label: "Retailer payment" },
      { href: "/erp/payments/new?type=supplier", label: "Supplier payment" },
      { href: "/erp/claims?kind=General", label: "Cash claim" },
      { href: "/erp/claims", label: "Claim register" },
    ],
  },
  {
    key: "accounts",
    label: "Accounts",
    links: [
      { href: "/erp/accounts", label: "Accounts" },
      { href: "/erp/accounts/voucher", label: "Journal voucher" },
      { href: "/erp/accounts/vouchers", label: "Voucher list" },
      { href: "/erp/accounts/journal", label: "Journal book" },
      { href: "/erp/accounts/ledger", label: "Ledger" },
      { href: "/erp/bad-debts", label: "Allowance for bad debts" },
    ],
  },
  {
    key: "transaction",
    label: "Transaction",
    links: [
      { href: "/erp/cashbook?kind=payment", label: "Transaction entry" },
      { href: "/erp/cashbook/list", label: "Transaction list" },
      { href: "/erp/cashbook?kind=transfer", label: "Transfer" },
      { href: "/erp/cashbook?kind=adjustment", label: "Adjustment" },
      { href: "/erp/m/cash-categories", label: "Categories" },
    ],
  },
  {
    key: "people",
    label: "People",
    links: [
      { href: "/erp/m/staff?kind=dsr", label: "DSR list" },
      { href: "/erp/m/staff?kind=sr", label: "SR list" },
      { href: "/erp/m/retailers", label: "Retailers" },
      { href: "/erp/people/due-memos", label: "Due memos" },
      { href: "/erp/m/routes", label: "Routes" },
      { href: "/erp/m/suppliers", label: "Suppliers" },
    ],
  },
  {
    key: "target",
    label: "Target",
    links: [
      { href: "/erp/targets", label: "SR monthly target" },
      { href: "/erp/targets/achievement", label: "Target vs achievement" },
    ],
  },
  {
    key: "staff",
    label: "Staff",
    links: [
      { href: "/erp/m/staff?kind=staff", label: "Staff list" },
      { href: "/erp/m/staff/new", label: "Add staff" },
      { href: "/erp/staff/salary", label: "Staff salary" },
      { href: "/erp/staff/attendance", label: "Attendance" },
      { href: "/erp/staff/leave", label: "Leave" },
      { href: "/erp/staff/payroll", label: "DSR payroll" },
      { href: "/erp/staff/policy", label: "DSR payroll policy" },
    ],
  },
  { key: "reports", label: "Reports", links: [{ href: "/erp/reports", label: "Report center" }] },
  {
    key: "sms",
    label: "SMS & Email",
    links: [
      { href: "/erp/sms", label: "Send SMS" },
      { href: "/erp/sms/due", label: "Due SMS" },
      { href: "/erp/sms/bulk", label: "Bulk SMS" },
      { href: "/erp/sms/email", label: "Send email" },
      { href: "/erp/sms/log", label: "SMS balance & log" },
      { href: "/erp/sms/setup", label: "SMS API setup" },
    ],
  },
  {
    key: "setup",
    label: "Users & Setup",
    links: [
      { href: "/erp/setup/users", label: "Users" },
      { href: "/erp/setup/roles", label: "Roles & permissions" },
      { href: "/erp/setup/company", label: "Company" },
    ],
  },
];

/** The module (group key) a page belongs to, by its path. */
const MODULE_BY_PREFIX: [string, string][] = [
  ["/erp/m/products", "products"], ["/erp/m/categories", "products"], ["/erp/m/promotions", "products"],
  ["/erp/purchase", "purchase"], ["/erp/receive", "receive"],
  ["/erp/sales", "sales"], ["/erp/reminders", "sales"],
  ["/erp/stock", "stock"], ["/erp/claims", "stock"],
  ["/erp/payments", "payments"],
  ["/erp/accounts", "accounts"], ["/erp/bad-debts", "accounts"],
  ["/erp/cashbook", "transaction"], ["/erp/m/cash-categories", "transaction"],
  ["/erp/m/retailers", "people"], ["/erp/m/routes", "people"], ["/erp/m/suppliers", "people"], ["/erp/people", "people"],
  ["/erp/targets", "target"],
  ["/erp/m/staff", "staff"], ["/erp/staff", "staff"],
  ["/erp/reports", "reports"], ["/erp/sms", "sms"], ["/erp/setup", "setup"],
];

export function moduleFor(path: string) {
  const hit = MODULE_BY_PREFIX.find(([p]) => path === p || path.startsWith(p + "/"));
  return hit?.[1] ?? "home";
}

/** null = every module allowed; the dashboard is always open. */
export const canOpen = (modules: string[] | null, key: string) => modules === null || key === "home" || modules.includes(key);

/** The menu link that best matches the current page (its path plus any query the link names). */
export function activeHref(path: string, search: URLSearchParams) {
  let best: { href: string; score: number } | null = null;
  for (const g of BUSINESS_NAV)
    for (const l of g.links) {
      const [p, q] = l.href.split("?");
      if (!(path === p || (p !== "/erp" && path.startsWith(p + "/")))) continue;
      const params = new URLSearchParams(q ?? "");
      let ok = true;
      params.forEach((v, k) => {
        if (search.get(k) !== v) ok = false;
      });
      if (!ok) continue;
      const score = p.length * 10 + [...params.keys()].length;
      if (!best || score > best.score) best = { href: l.href, score };
    }
  return best?.href ?? null;
}
