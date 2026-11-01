// One description per master list (retailers, products, …): the list page, the form and the save action read it.

export type OptionSource = "routes" | "suppliers" | "categories" | "srs" | "products";
export type MasterField = {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "checkbox" | "date";
  required?: boolean;
  source?: OptionSource;
  options?: { value: string; label: string }[];
  help?: string;
  wide?: boolean;
  /** Not a real column — handled by the master's toRow/fromRow. */
  virtual?: boolean;
  /** Only shown when adding (opening balance / opening stock, posted once as an opening entry). */
  newOnly?: boolean;
  defaultValue?: string | number | boolean;
};
export type MasterColumn = { label: string; get: string; right?: boolean; kind?: "money" | "qty" | "balance" };
export type Master = {
  key: string;
  table: string;
  title: string;
  singular: string;
  nameField: string;
  select: string;
  order: string;
  search: string[];
  columns: MasterColumn[];
  fields: MasterField[];
  /** Party type used to show each row's ledger balance. */
  balance?: "retailer" | "supplier" | "sr";
  hasActive?: boolean;
  /** What an opening amount on a new record means: a party balance, or opening stock (pieces at the buy price). */
  opening?: "party" | "stock";
  toRow?: (values: Record<string, unknown>, lookup: { productName: (id: number) => string | undefined }) => Record<string, unknown>;
  fromRow?: (row: Record<string, unknown>) => Record<string, unknown>;
};

type Tier = { min: number; max: number | null; rate: number };

/** "600000-800000:2, 1000000-:3.5" → tiers; null when blank (the DSR then follows the payroll policy). */
export function parseTiers(text: string): Tier[] | null {
  const tiers = text
    .split(",")
    .map((p) => /^\s*(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)?\s*:\s*(\d+(?:\.\d+)?)\s*$/.exec(p))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => ({ min: Number(m[1]), max: m[2] ? Number(m[2]) : null, rate: Number(m[3]) }))
    .sort((a, b) => a.min - b.min);
  return tiers.length ? tiers : null;
}
export const tiersText = (t: Tier[] | null) => (t ?? []).map((x) => `${x.min}-${x.max ?? ""}:${x.rate}`).join(", ");

const yesNo = [
  { value: "sr", label: "SR (sales representative)" },
  { value: "dsr", label: "DSR (delivery)" },
  { value: "staff", label: "Office staff" },
];

export const MASTERS: Record<string, Master> = {
  retailers: {
    key: "retailers",
    table: "erp_retailers",
    title: "Retailers",
    singular: "retailer",
    nameField: "name",
    select: "id, code, name, name_bn, mobile, address, active, route:erp_routes(name)",
    order: "code",
    search: ["code", "name", "name_bn", "mobile", "address"],
    balance: "retailer",
    hasActive: true,
    columns: [
      { label: "Code", get: "code" },
      { label: "Name", get: "name" },
      { label: "নাম", get: "name_bn" },
      { label: "Route", get: "route.name" },
      { label: "Mobile", get: "mobile" },
      { label: "Balance", get: "balance", right: true, kind: "balance" },
    ],
    fields: [
      { name: "code", label: "Retailer code", type: "text", required: true },
      { name: "name", label: "Retailer name", type: "text", required: true },
      { name: "name_bn", label: "Retailer name (Bangla)", type: "text" },
      { name: "owner_name", label: "Owner name", type: "text" },
      { name: "nid", label: "NID", type: "text" },
      { name: "route_id", label: "Route", type: "select", source: "routes" },
      { name: "sr_id", label: "SR", type: "select", source: "srs" },
      { name: "mobile", label: "Mobile", type: "text" },
      { name: "email", label: "Email", type: "text" },
      { name: "address", label: "Address", type: "textarea", wide: true },
      { name: "remark", label: "Remark", type: "textarea", wide: true },
      { name: "opening_balance", label: "Opening balance (৳ they owe)", type: "number", virtual: true, newOnly: true },
      { name: "active", label: "Active", type: "checkbox", defaultValue: true },
    ],
    opening: "party",
  },
  routes: {
    key: "routes",
    table: "erp_routes",
    title: "Routes",
    singular: "route",
    nameField: "name",
    select: "id, name, description, retailers:erp_retailers(count)",
    order: "name",
    search: ["name", "description"],
    columns: [
      { label: "Route", get: "name" },
      { label: "Description", get: "description" },
      { label: "Retailers", get: "retailers.0.count", right: true },
    ],
    fields: [
      { name: "name", label: "Route name", type: "text", required: true },
      { name: "description", label: "Description", type: "text", wide: true },
    ],
  },
  suppliers: {
    key: "suppliers",
    table: "erp_suppliers",
    title: "Suppliers",
    singular: "supplier",
    nameField: "name",
    select: "id, name, contact_person, mobile, address, claims:erp_claims(claimed, received)",
    order: "name",
    search: ["name", "contact_person", "mobile"],
    balance: "supplier",
    columns: [
      { label: "Supplier", get: "name" },
      { label: "Contact", get: "contact_person" },
      { label: "Mobile", get: "mobile" },
      { label: "Payable", get: "balance", right: true, kind: "balance" },
      { label: "Claim due", get: "claim_due", right: true, kind: "money" },
    ],
    fields: [
      { name: "name", label: "Supplier", type: "text", required: true },
      { name: "contact_person", label: "Contact person", type: "text" },
      { name: "mobile", label: "Mobile", type: "text" },
      { name: "address", label: "Address", type: "text", wide: true },
      { name: "opening_balance", label: "Opening balance (৳ we owe them)", type: "number", virtual: true, newOnly: true },
    ],
    opening: "party",
  },
  staff: {
    key: "staff",
    table: "erp_staff",
    title: "SR, DSR & staff",
    singular: "person",
    nameField: "name",
    select: "id, kind, name, designation, mobile, salary, active, incentive_tiers, route:erp_routes(name)",
    order: "name",
    search: ["name", "designation", "mobile"],
    hasActive: true,
    columns: [
      { label: "Name", get: "name" },
      { label: "Role", get: "kind" },
      { label: "Designation", get: "designation" },
      { label: "Route", get: "route.name" },
      { label: "Mobile", get: "mobile" },
      { label: "Salary", get: "salary", right: true, kind: "money" },
    ],
    fields: [
      { name: "kind", label: "Role", type: "select", options: yesNo, required: true, defaultValue: "sr" },
      { name: "name", label: "Name", type: "text", required: true },
      { name: "designation", label: "Designation", type: "text" },
      { name: "mobile", label: "Mobile", type: "text" },
      { name: "route_id", label: "Usual route", type: "select", source: "routes" },
      { name: "salary", label: "Basic salary (৳/month)", type: "number", defaultValue: 0 },
      { name: "daily_allowance", label: "Daily allowance (৳/working day)", type: "number", defaultValue: 100 },
      { name: "joining_date", label: "Joining date", type: "date" },
      { name: "nid", label: "NID", type: "text" },
      { name: "email", label: "Email", type: "text" },
      { name: "father_name", label: "Father's name", type: "text" },
      { name: "mother_name", label: "Mother's name", type: "text" },
      { name: "address", label: "Address", type: "textarea", wide: true },
      { name: "incentive_text", label: "Own incentive tiers (DSR)", type: "text", virtual: true, wide: true, help: "Blank = follow the payroll policy. Format: 600000-800000:2, 800000-1000000:3, 1000000-:3.5" },
      { name: "opening_balance", label: "Opening balance (৳ an SR/DSR owes; for office staff, salary owed to them)", type: "number", virtual: true, newOnly: true },
      { name: "active", label: "Active", type: "checkbox", defaultValue: true },
    ],
    opening: "party",
    toRow: (v) => {
      const { incentive_text, ...rest } = v;
      return { ...rest, incentive_tiers: parseTiers(String(incentive_text ?? "")) };
    },
    fromRow: (row) => ({ ...row, incentive_text: tiersText(row.incentive_tiers as Tier[] | null) }),
  },
  products: {
    key: "products",
    table: "erp_products",
    title: "Products",
    singular: "product",
    nameField: "name",
    select: "id, code, name, name_bn, per, buy_price, sale_price, min_stock, active, category:erp_categories(name), supplier:erp_suppliers(name)",
    order: "name",
    search: ["name", "name_bn", "code", "barcode"],
    hasActive: true,
    columns: [
      { label: "Product", get: "name" },
      { label: "Category", get: "category.name" },
      { label: "Supplier", get: "supplier.name" },
      { label: "Pcs/ctn", get: "per", right: true },
      { label: "Buy", get: "buy_price", right: true, kind: "money" },
      { label: "Sale", get: "sale_price", right: true, kind: "money" },
      { label: "Margin", get: "margin", right: true },
      { label: "Stock", get: "stock", right: true, kind: "qty" },
    ],
    fields: [
      { name: "name", label: "Product name", type: "text", required: true },
      { name: "name_bn", label: "Item name (Bangla)", type: "text" },
      { name: "code", label: "Code", type: "text" },
      { name: "barcode", label: "Barcode", type: "text" },
      { name: "category_id", label: "Category", type: "select", source: "categories" },
      { name: "supplier_id", label: "Supplier", type: "select", source: "suppliers" },
      { name: "group_unit", label: "Group unit", type: "text", defaultValue: "CTN" },
      { name: "per", label: "Pieces per carton", type: "number", required: true, defaultValue: 12 },
      { name: "unit", label: "Unit", type: "text", defaultValue: "PCS" },
      { name: "buy_price", label: "Buy price (per piece)", type: "number", required: true },
      { name: "sale_price", label: "Sale price (per piece)", type: "number", required: true },
      { name: "min_stock", label: "Min stock (pcs)", type: "number", defaultValue: 0 },
      { name: "commission_pct", label: "Commission %", type: "number", defaultValue: 0 },
      { name: "opening_stock", label: "Opening stock (pcs, valued at the buy price)", type: "number", virtual: true, newOnly: true },
      { name: "active", label: "Active", type: "checkbox", defaultValue: true },
    ],
    opening: "stock",
  },
  categories: {
    key: "categories",
    table: "erp_categories",
    title: "Categories",
    singular: "category",
    nameField: "name",
    select: "id, name, products:erp_products(count)",
    order: "name",
    search: ["name"],
    columns: [
      { label: "Category", get: "name" },
      { label: "Products", get: "products.0.count", right: true },
    ],
    fields: [{ name: "name", label: "Category name", type: "text", required: true }],
  },
  promotions: {
    key: "promotions",
    table: "erp_promotions",
    title: "Promotional offers",
    singular: "offer",
    nameField: "name",
    select: "id, name, basis, target_qty, target_amount, free_options, starts_on, ends_on, applies_to, active, product:erp_products(name)",
    order: "name",
    search: ["name"],
    hasActive: true,
    columns: [
      { label: "Offer", get: "name" },
      { label: "Product", get: "product.name" },
      { label: "Target", get: "target" },
      { label: "Free", get: "free" },
      { label: "From", get: "starts_on" },
      { label: "To", get: "ends_on" },
      { label: "Applies to", get: "applies_to" },
    ],
    fields: [
      { name: "name", label: "Offer name", type: "text", required: true, wide: true },
      { name: "product_id", label: "Product (blank = whole-order offer)", type: "select", source: "products" },
      { name: "basis", label: "Target by", type: "select", options: [{ value: "qty", label: "Quantity (pcs)" }, { value: "value", label: "Value (৳)" }], defaultValue: "qty" },
      { name: "target_qty", label: "Target quantity (pcs)", type: "number" },
      { name: "target_amount", label: "Target value (৳)", type: "number" },
      { name: "free_product_id", label: "Free product (option 1)", type: "select", source: "products", required: true, virtual: true },
      { name: "free_qty", label: "Free quantity (pcs) per target", type: "number", required: true, virtual: true },
      { name: "free_product_id_2", label: "Free product (option 2)", type: "select", source: "products", virtual: true },
      { name: "free_qty_2", label: "Free quantity, option 2", type: "number", virtual: true },
      { name: "free_product_id_3", label: "Free product (option 3)", type: "select", source: "products", virtual: true },
      { name: "free_qty_3", label: "Free quantity, option 3", type: "number", virtual: true },
      { name: "starts_on", label: "Start date", type: "date" },
      { name: "ends_on", label: "End date", type: "date" },
      { name: "applies_to", label: "Applies to", type: "select", options: [{ value: "sales", label: "Sales" }, { value: "purchase", label: "Purchase" }, { value: "both", label: "Both" }], defaultValue: "sales" },
      { name: "active", label: "Active", type: "checkbox", defaultValue: true },
    ],
    // Up to three free-product choices, like Rushda's "Free Product Option(s)"; the sales form lets you pick one.
    toRow: (v, lookup) => {
      const { free_product_id, free_qty, free_product_id_2, free_qty_2, free_product_id_3, free_qty_3, ...rest } = v;
      const opts = [[free_product_id, free_qty], [free_product_id_2, free_qty_2], [free_product_id_3, free_qty_3]]
        .map(([pid, q]) => ({ product_id: Number(pid), qty: Number(q) || 0 }))
        .filter((o) => o.product_id && o.qty > 0)
        .map((o) => ({ ...o, name: lookup.productName(o.product_id) ?? "" }));
      return { ...rest, free_options: opts };
    },
    fromRow: (row) => {
      const o = (row.free_options as { product_id: number; qty: number }[] | null) ?? [];
      return {
        ...row,
        free_product_id: o[0]?.product_id ?? null, free_qty: o[0]?.qty ?? null,
        free_product_id_2: o[1]?.product_id ?? null, free_qty_2: o[1]?.qty ?? null,
        free_product_id_3: o[2]?.product_id ?? null, free_qty_3: o[2]?.qty ?? null,
      };
    },
  },
  "cash-categories": {
    key: "cash-categories",
    table: "erp_cash_categories",
    title: "Income & expense categories",
    singular: "category",
    nameField: "name",
    select: "id, name, kind",
    order: "name",
    search: ["name"],
    columns: [
      { label: "Category", get: "name" },
      { label: "Type", get: "kind" },
    ],
    fields: [
      { name: "name", label: "Category name", type: "text", required: true },
      { name: "kind", label: "Type", type: "select", required: true, options: [{ value: "expense", label: "Expense" }, { value: "income", label: "Income" }, { value: "transfer", label: "Transfer" }] },
    ],
  },
};
