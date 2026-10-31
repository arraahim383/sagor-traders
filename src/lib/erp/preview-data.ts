import products from "./fixtures/rushda-products-2026-10-31.json";
import type { ErpProduct } from "./types";

// Snapshot from Rushda on 2026-10-31, used until the business tables exist in the database.
export const previewProducts = products as ErpProduct[];
export const previewSrs = [
  { id: 2, name: "Md. Abul Hasnat", balance: 31255.6 },
  { id: 1, name: "Md. Shoukat Osman", balance: 0 },
];
export const previewDsrs: { id: number; name: string; balance: number }[] = [];
export const previewRetailers = [
  { id: 1, name: "1001 - M/s Pori Sajghkhor", balance: 0 },
  { id: 2, name: "1002 - M/S Jihad store", balance: 0 },
  { id: 3, name: "1003 - Keye Farmaci", balance: 0 },
  { id: 4, name: "1004 - M/S Emon Store", balance: 0 },
  { id: 5, name: "1005 - M/S Aminul varaity store", balance: 0 },
];
