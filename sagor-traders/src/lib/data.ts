import "server-only";
import { cache } from "react";
import { hasSupabase } from "./supabase/env";
import { createPublicClient } from "./supabase/server";
import { seedBrands, seedCategories, seedOffers, seedProducts, seedSettings, seedTeam } from "./seed";
import type { Brand, Category, Offer, Product, SiteSettings, TeamMember } from "./types";

const PRODUCT_SELECT = "*, brand:brands(id,name,slug), category:categories(id,name,slug)";

function warn(scope: string, error: unknown) {
  console.error(`[data] ${scope} failed, falling back to bundled content:`, error);
}

export const getSettings = cache(async (): Promise<SiteSettings> => {
  if (!hasSupabase) return seedSettings;
  const { data, error } = await createPublicClient().from("site_settings").select("*").eq("id", 1).maybeSingle();
  if (error || !data) {
    warn("settings", error);
    return seedSettings;
  }
  return { ...seedSettings, ...data, stats: Array.isArray(data.stats) ? data.stats : seedSettings.stats };
});

export const getBrands = cache(async (): Promise<Brand[]> => {
  if (!hasSupabase) return seedBrands;
  const { data, error } = await createPublicClient().from("brands").select("*").order("sort_order").order("name");
  if (error) {
    warn("brands", error);
    return seedBrands;
  }
  return data ?? [];
});

export const getCategories = cache(async (): Promise<Category[]> => {
  if (!hasSupabase) return seedCategories;
  const { data, error } = await createPublicClient().from("categories").select("*").order("sort_order").order("name");
  if (error) {
    warn("categories", error);
    return seedCategories;
  }
  return data ?? [];
});

export const getProducts = cache(async (): Promise<Product[]> => {
  if (!hasSupabase) return seedProducts;
  const { data, error } = await createPublicClient()
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .order("sort_order")
    .order("name");
  if (error) {
    warn("products", error);
    return seedProducts;
  }
  return (data ?? []) as Product[];
});

export const getProduct = cache(async (slug: string): Promise<Product | null> => {
  if (!hasSupabase) return seedProducts.find((p) => p.slug === slug) ?? null;
  const { data, error } = await createPublicClient()
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) {
    warn("product", error);
    return seedProducts.find((p) => p.slug === slug) ?? null;
  }
  return (data as Product) ?? null;
});

export const getTeam = cache(async (): Promise<TeamMember[]> => {
  if (!hasSupabase) return seedTeam;
  const { data, error } = await createPublicClient()
    .from("team_members")
    .select("*")
    .eq("is_visible", true)
    .order("sort_order")
    .order("name");
  if (error) {
    warn("team", error);
    return seedTeam;
  }
  return data ?? [];
});

export const getLiveOffers = cache(async (): Promise<Offer[]> => {
  if (!hasSupabase) return seedOffers;
  // Row-level security only returns offers that are active and within their dates.
  const { data, error } = await createPublicClient()
    .from("offers")
    .select("*, product:products(id,name,slug)")
    .order("ends_on", { ascending: true, nullsFirst: false });
  if (error) {
    warn("offers", error);
    return seedOffers;
  }
  return (data ?? []) as Offer[];
});
