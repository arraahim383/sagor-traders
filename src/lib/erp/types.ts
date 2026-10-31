/** One receipt of stock, consumed oldest first. `rate` is cost, `sale` the selling price for that lot. */
export type Lot = { qty: number; rate: number; sale: number };

export type FreeOption = { product_id: number; name: string; qty: number };

/** A per-product promotional offer: reach `target_qty` pieces (or `target_amount` taka) and get free items. */
export type Promo = {
  offer_id: number;
  basis: "qty" | "value";
  target_qty?: number | null;
  target_amount?: number | null;
  free_options: FreeOption[];
};

/** "Reach this order total, get a free item" — judged on the whole order, not one line. */
export type OrderWideOffer = { offer_id: number; target_amount: number; free_options: FreeOption[] };

export type ErpProduct = {
  id: number;
  name: string;
  /** Default sale price per piece. */
  price: number;
  sup: string;
  category: string;
  /** Pieces in stock. */
  stock: number;
  /** Pieces per carton (Rushda defaults to 12). */
  per: number;
  lots: Lot[];
  barcode?: string | null;
  promo?: Promo | null;
};

export type OrderType = "dsr" | "direct" | "return";
