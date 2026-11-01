import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { round4 } from "./money";
import { DEFAULT_PAYROLL_POLICY } from "./people";
import type { ErpProduct, OrderWideOffer, Promo } from "./types";

export type Party = { id: number; name: string; balance: number };

type Page<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

/** The API returns at most 1,000 rows per select; page through (with a stable order) to get every row. */
export async function selectAll<T>(page: (from: number, to: number) => Page<T>): Promise<T[]> {
  const size = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < size) return out;
  }
}

type ProductRow = {
  id: number;
  name: string;
  barcode: string | null;
  per: number;
  sale_price: number;
  category: { name: string } | null;
  supplier: { name: string } | null;
  lots: { qty_left: number; rate: number; sale: number; received_on: string; id: number }[];
};

/** Products with their open FIFO lots (oldest first); stock is always the sum of the lots. */
export async function loadProducts(supabase: SupabaseClient, ids?: number[]): Promise<ErpProduct[]> {
  let q = supabase
    .from("erp_products")
    .select("id, name, barcode, per, sale_price, category:erp_categories(name), supplier:erp_suppliers(name), lots:erp_lots(id, qty_left, rate, sale, received_on)")
    .eq("active", true)
    .order("id");
  if (ids) q = q.in("id", ids);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as ProductRow[]).map((p) => {
    const lots = p.lots
      .filter((l) => Number(l.qty_left) > 0)
      .sort((a, b) => a.received_on.localeCompare(b.received_on) || a.id - b.id)
      .map((l) => ({ qty: Number(l.qty_left), rate: round4(Number(l.rate)), sale: round4(Number(l.sale)) }));
    return {
      id: p.id,
      name: p.name,
      price: round4(Number(p.sale_price)),
      sup: p.supplier?.name ?? "",
      category: p.category?.name ?? "",
      stock: lots.reduce((s, l) => s + l.qty, 0),
      per: p.per || 12,
      lots,
      barcode: p.barcode,
      promo: null,
    };
  });
}

async function balances(supabase: SupabaseClient, type: string) {
  const data = await selectAll<{ party_id: number; balance: number }>((a, b) =>
    supabase.from("erp_party_balances").select("party_id, balance").eq("party_type", type).order("party_id").range(a, b),
  );
  return new Map(data.map((r) => [Number(r.party_id), Number(r.balance)]));
}

/** Every retailer (active only unless `all`); there are more than the API's 1,000-row page. */
export function loadRetailers(supabase: SupabaseClient, all = false) {
  return selectAll<{ id: number; code: string; name: string }>((a, b) => {
    const q = supabase.from("erp_retailers").select("id, code, name");
    return (all ? q : q.eq("active", true)).order("code").order("id").range(a, b);
  });
}

/** Live promotional offers (by date) for sales or purchasing, attached per product plus whole-order offers. */
export async function loadPromotions(supabase: SupabaseClient, kind: "sales" | "purchase", onDate: string) {
  const { data } = await supabase
    .from("erp_promotions")
    .select("id, product_id, basis, target_qty, target_amount, free_options, starts_on, ends_on")
    .eq("active", true)
    .in("applies_to", [kind, "both"]);
  const live = (data ?? []).filter((p) => (!p.starts_on || p.starts_on <= onDate) && (!p.ends_on || p.ends_on >= onDate));
  const byProduct = new Map<number, Promo>();
  const orderWide: OrderWideOffer[] = [];
  for (const p of live) {
    const free_options = (p.free_options ?? []) as Promo["free_options"];
    if (p.product_id) byProduct.set(Number(p.product_id), { offer_id: p.id, basis: p.basis, target_qty: p.target_qty, target_amount: p.target_amount, free_options });
    else if (p.target_amount) orderWide.push({ offer_id: p.id, target_amount: Number(p.target_amount), free_options });
  }
  return { byProduct, orderWide };
}

export async function loadPurchaseProducts(supabase: SupabaseClient) {
  const { data } = await supabase.from("erp_stock_list").select("id, name, supplier_id, per, buy_price, sale_price, stock").eq("active", true).order("name");
  return (data ?? []).map((p) => ({ id: p.id, name: p.name, supplierId: p.supplier_id, per: p.per, buy: Number(p.buy_price), sale: Number(p.sale_price), stock: Number(p.stock) }));
}

export async function loadSuppliersWithBalance(supabase: SupabaseClient) {
  const [{ data }, bal] = await Promise.all([supabase.from("erp_suppliers").select("id, name").order("name"), partyBalances(supabase, "supplier")]);
  return (data ?? []).map((s) => ({ id: s.id, name: s.name, balance: bal.get(s.id) ?? 0 }));
}

export type Opt = { value: string; label: string };

/** Dropdown options for master forms and filters. */
export async function loadOptions(supabase: SupabaseClient, sources: string[]): Promise<Record<string, Opt[]>> {
  const out: Record<string, Opt[]> = {};
  const want = new Set(sources);
  const jobs: Promise<void>[] = [];
  const add = (key: string, p: PromiseLike<{ data: { id: number; name: string }[] | null }>) =>
    jobs.push(Promise.resolve(p).then(({ data }) => void (out[key] = (data ?? []).map((r) => ({ value: String(r.id), label: r.name })))));
  if (want.has("routes")) add("routes", supabase.from("erp_routes").select("id, name").order("name"));
  if (want.has("suppliers")) add("suppliers", supabase.from("erp_suppliers").select("id, name").order("name"));
  if (want.has("categories")) add("categories", supabase.from("erp_categories").select("id, name").order("name"));
  if (want.has("srs")) add("srs", supabase.from("erp_staff").select("id, name").eq("kind", "sr").eq("active", true).order("name"));
  if (want.has("dsrs")) add("dsrs", supabase.from("erp_staff").select("id, name").eq("kind", "dsr").eq("active", true).order("name"));
  if (want.has("staff")) add("staff", supabase.from("erp_staff").select("id, name").eq("active", true).order("name"));
  if (want.has("products")) add("products", supabase.from("erp_products").select("id, name").eq("active", true).order("name"));
  if (want.has("cashAccounts")) add("cashAccounts", supabase.from("erp_accounts").select("id, name").eq("is_cash", true).eq("active", true).order("code"));
  await Promise.all(jobs);
  return out;
}

/** Balances (debit − credit) for a set of parties of one type. */
export async function partyBalances(supabase: SupabaseClient, type: string, ids?: number[]) {
  if (!ids) return balances(supabase, type);
  const { data } = await supabase.from("erp_party_balances").select("party_id, balance").eq("party_type", type).in("party_id", ids.length ? ids : [-1]);
  return new Map((data ?? []).map((r) => [Number(r.party_id), Number(r.balance)]));
}

export async function loadParties(supabase: SupabaseClient) {
  const [staff, retailers, srBal, dsrBal, rBal] = await Promise.all([
    supabase.from("erp_staff").select("id, kind, name").in("kind", ["sr", "dsr"]).eq("active", true).order("name"),
    loadRetailers(supabase),
    balances(supabase, "sr"),
    balances(supabase, "dsr"),
    balances(supabase, "retailer"),
  ]);
  const people = staff.data ?? [];
  const toParty = (map: Map<number, number>) => (r: { id: number; name: string }) => ({ id: r.id, name: r.name, balance: map.get(r.id) ?? 0 });
  return {
    srs: people.filter((s) => s.kind === "sr").map(toParty(srBal)) as Party[],
    dsrs: people.filter((s) => s.kind === "dsr").map(toParty(dsrBal)) as Party[],
    retailers: retailers.map((r) => ({ id: r.id, name: `${r.code} - ${r.name}`, balance: rBal.get(r.id) ?? 0 })) as Party[],
  };
}

/** The DSR payroll policy (Staff → DSR payroll policy), falling back to Rushda's defaults. */
export async function loadPayrollPolicy(supabase: SupabaseClient): Promise<typeof DEFAULT_PAYROLL_POLICY> {
  const { data } = await supabase.from("erp_settings").select("value").eq("key", "payroll_policy").maybeSingle();
  const v = (data?.value ?? {}) as Partial<typeof DEFAULT_PAYROLL_POLICY>;
  return {
    basicSalary: Number(v.basicSalary ?? DEFAULT_PAYROLL_POLICY.basicSalary),
    dailyAllowance: Number(v.dailyAllowance ?? DEFAULT_PAYROLL_POLICY.dailyAllowance),
    tiers: Array.isArray(v.tiers) && v.tiers.length ? v.tiers : DEFAULT_PAYROLL_POLICY.tiers,
  };
}
