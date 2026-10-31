# Sales Order (Rushda: `/sales/create`)

Captured read-only from sagor.rushdhadms.com on 2026-10-31. Source of truth for our rebuild.

## Header fields
- **Date** (default today)
- **Type**: `DSR Sales` | `Direct` | `Return`
  - DSR Sales / Return: requires **DSR** and **SR**; retailer picker hidden. Shows each one's current ledger balance.
  - Direct: requires **Retailer** (shown as `code - name`, e.g. `1001 - M/s Pori Sajghkhor`); DSR/SR hidden. Shows retailer balance.
- Filters only (not saved): Supplier, Category, product search (name or barcode).
- **Status**: saved as `draft` or `finalized`. Re-finalizing an already finalized order reverses its previous stock + ledger effects and re-applies them.

## Product data each row needs
`id, name, price (default sale price), sup (supplier), category, stock (pcs), per (pcs per carton, default 12), lots[{qty, rate (cost), sale (sale price)}] oldest first, barcode, promo`

## Line columns
| Column | Input? | Formula |
| --- | --- | --- |
| Carton | yes (integer) | |
| Piece | yes (integer) | |
| Order Qty | shown | `carton*per + piece + freeQty` (what the DSR physically carries out) |
| Return | yes (integer) | |
| Damage | yes (integer) | |
| Sold Qty | shown | `max(0, carton*per + piece - return - damage)` |
| Free Qty | yes (decimal, step 0.001) | price 0 |
| Price | auto or manual (4 dp) | auto = FIFO sale rate; typing makes the row **manual** |
| Sub Total | shown | manual: `round2(soldQty * price)`; auto: FIFO amount |

Line is skipped when `carton+piece == 0 && freeQty <= 0`, or when soldQty, return, damage and free are all 0.

Stock check (on blur and on submit): `soldQty + freeQty > stock` → error "only N in stock"; the input is cleared. Sold Qty turns red when `soldQty > stock`.

## FIFO (`fifoCalc(product, qty, field)`)
`field` = `'sale'` for selling price, `'rate'` for cost.
```
lots oldest first; first = lots[0][field] || product.price; last = lots[last][field] || product.price
if qty <= 0 → {amount: 0, rate: first}
rem = qty; amt = 0
for each lot: take = min(lot.qty, rem); amt += take * (lot[field] || product.price); rem -= take
if rem > 0: amt += rem * last          // shortfall priced at the newest lot
amount = round2(amt); rate = round4(amt / qty)
```
Example from their comment: lots 10@100 then 5@105, 11 pcs → 1105.

Manual-price detection when reopening a saved order: a line is manual if it had a stored manual flag, or (editing, soldQty>0 and (order already finalized or |product.price − fifo.rate| > 0.02)).

## Totals (`recalc`)
```
total    = Σ line subtotals (all lines, even ones hidden by filters)
payable  = total − commission − cashClaim − cashDamage − transport − dsrCost − discount
paid     = input; if "Paid Full" ticked → paid = round2(payable) and locked
due      = payable − paid
```
- `due > 0` → shown as **Due** (red): "Added to {SR or DSR}'s ledger as due".
- `due < −0.005` → shown as **Receive** (green): "Credited to {SR or DSR}'s ledger".
- Party for the hint: the SR if chosen, otherwise the DSR.
- Server posting (from their comment): the SR/DSR ledger is charged the payable, then credited what was actually paid.

## Payment
- **Payment Mode**: Cash | Bkash | Nagad | Bank.
- **Deposit Account**: Auto (by mode) | Cash | Bank | bKash-01777940795 | Nagad-01777940795.
- **Split Receive**: several rows of (account, amount); must equal the **main paid** amount to within 0.01, else blocked.
  - `mainPaid = round2(paid − Σ retailerDue.paid)`; retailer-due payments always settle via Cash.
- **Remark** (text).

## Promotional offers (auto free lines)
Recomputed from scratch on every change, keyed by the trigger product.
- Per-product promo `{offer_id, basis: 'qty'|'value', target_qty, target_amount, free_options[{product_id, name, qty}]}`
  - basis qty: needs `soldQty ≥ target_qty`; `multiples = floor(soldQty / target_qty)`
  - basis value: needs `subtotal ≥ target_amount`; `multiples = floor(subtotal / target_amount)`
- Order-wide offers: `orderTotal ≥ target_amount`; `multiples = floor(orderTotal / target_amount)`; labelled "FREE (Order Value)".
- Free qty = `multiples × chosen option's qty`; default option = first; buyer can pick another option (resets to its formula qty).
- Qty is editable; a typed qty is remembered for that trigger while it still qualifies.
- Removing a free line declines it for that exact `multiples` count; it reappears if a higher multiple is reached.
- Free lines are saved as lines with `price 0, manual 1, is_free 1, promotional_offer_id`, qty in pieces; stock-checked too.

## Extra Damage (modal, saved immediately as a separate "note")
Columns: Item, Damage Carton, Damage Pcs, Total Qty (`carton*per+pcs`), Price, Sub Total, **Stock Returned?** (default yes).
- Price auto-fills with FIFO **cost** rate (`fifoCalc(p, qty)`, field `rate`) unless typed by hand; a typed price is sent as an override.
- `subtotal = round2(qty * price)`.
- Stock returned = goods come back (qty limited by stock). Unticked = **cash only**: DSR pays, keeps goods, no stock movement.
- Each saved note adds its total to the order's **Cash Damage** (`cashDamage = round2(baseline + Σ notes)`), which reduces payable.
- Deleting a damage line restores stock (if returned) and reduces Cash Damage.

## Due Retailer (DSR Sales only, after the draft exists)
Goods from this order handed to a specific retailer on credit.
- Pick retailer, enter carton/pcs for items already in the order (≤ stock), price = FIFO sale, plus **Paid** now.
- Their qty is **added to the main order lines** (counts in Sold Qty/Total; stock issued once on finalize).
- `retailerDue = max(0, round2(Σ subtotal − paid))` goes to **that retailer's ledger instead of the DSR's**.
- Retailer-due paid amounts add to the order's Paid.

## Reminder (modal)
Title (default "Due collection — {party}"), remind date (required), amount (defaults to current due), note; linked to retailer or DSR and order.
