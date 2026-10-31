# Purchase Order & Goods Receive

Captured read-only from Rushda (`/purchase-order/create`, `/goods-receive`) on 2026-10-31.

## Purchase Order (`/purchase-order/create`)
- Header: **Date**, **PO No** (auto on save), **Supplier** (loads only that supplier's products), Remark.
- Line: Carton, Piece → `qty = carton*per + piece` (per = pcs per carton, default 12); **Buy Price** (defaults to product buy price, editable on desktop, 4 dp); `subtotal = qty * buyPrice` (not rounded on screen).
- `PO subtotal = Σ line subtotals`. No commission/transport/payment on a PO.
- Lines with `carton+piece == 0` are skipped. At least one line required.
- Promotional offers: same engine as sales (per-product qty/value basis + order-wide value offers, editable qty, decline per multiple). Free lines saved as `carton 0, piece qty, buy_price 0, is_free 1, promotional_offer_id`.
- PO list tracks **Ordered Qty vs Received Qty** and Status (receipts can be made against a PO).

## Goods Receive Note (`/goods-receive`) — stock in
- Header: **Date**, supplier **Invoice #**, **Supplier**.
- Line: Carton, Piece → `qty = carton*per + piece`; **Free Qty** (decimal, received free, price 0); **Buy Price** (editable); **Sale Price** (editable — sets the selling price of this lot); `subtotal = qty * buyPrice`.
- Line kept when `carton+piece > 0` or `freeQty > 0`. If a typed price is 0/blank it falls back to the product's current buy/sale price.
- Summary:
  ```
  subTotal = Σ line subtotals
  payable  = subTotal − commission + transport
  if "Full" ticked: paid = round2(max(0, payable − advanceAvailable))
  advanceApplied = min(advanceAvailable, max(0, payable − paid))
  due = payable − paid − advanceApplied
  ```
  `advanceAvailable` = money already paid to this supplier in advance (supplier balance in our favour); it is used up before creating a new due.
- **Pay From** account (Cash/Bank/bKash/Nagad) + Mode.
- Promo free lines (only when not receiving against a PO): saved as `piece qty, buy_price 0, sale_price = product sale price, is_free 1`.
- Each received line becomes a new **FIFO lot** for the product: `{qty (incl. free), rate = buy price, sale = sale price}`. Sales then consume lots oldest first (see `01-sales-order.md`).
- Receive Notes list: Invoice #, Date, Supplier, Mobile, Total, Paid, Due.
