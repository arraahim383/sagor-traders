# Stock, people, targets, payroll & reports

Captured read-only from Rushda on 2026-10-31.

## Products
- Fields: barcode, code (auto e.g. `P260914132954`), category, name, name (Bangla), supplier, group unit, **unit per group** (pcs per carton, default 12), unit, buy price, sale price, opening stock, min stock, commission %, photo.
- **Margin** (product list) = `(sale − buy) / buy × 100`, shown to 2 dp with % (e.g. buy 355.20, sale 372 → 4.73%).
- Stock badge: ≤ 0 red, < 10 amber, else green. **Low stock** = stock ≤ min stock.
- Every stock-in creates a FIFO lot `{qty, rate (cost), sale}`; every stock-out consumes lots oldest first.

## Stock Adjust (per product row)
- **Direction** toggle Increase (default) / Decrease governs both Adjust Qty and Damage Qty.
- Adjust Qty > 0 → stock increase or decrease (date, reason).
- Damage Qty, direction Increase → records new damage ("extra damage" note), billed at typed rate or else FIFO cost: `rate = round4(fifoCost(qty) / qty)`; stock goes down.
- Damage Qty, direction Decrease → reduces previously recorded damage; that qty comes back into stock as a new lot at the typed rate or the product's buy price.
- Changing Buy/Sale price on the row updates the product's prices.
- Quantities shown to 3 dp. History keeps the last 50 adjustments (product, increase, decrease, date, reason).

## Damage claim → supplier
- Per item: Total Damaged, Already Claimed, `available = damaged − claimed`, Claim Qty (≤ available, defaults to available), Price, `subtotal = qty × price`; totals rounded 2 dp.
- Sent to one supplier (date, remark) → Claim # (e.g. CLM-2026-00005), posted Dr Damage Claim Receivable / Cr Other Income; tracked in Claim Register.
- **Damage Recover**: product, qty, date, remark — recovered goods back into stock.
- **Free Stock** report: per product Free Received (GRN) − Free Given (Sales) = Current Free Stock.

## Over Rate / Under Rate
For each sold line in the period: `actual = product list sale price`; `diff = (soldPrice − actual) × soldQty`; positive → **Over**, negative → **Under** (shown positive).
Example: 800 pcs sold at 8.1250 vs actual 8.9775 → Under 682.00.
Per supplier: `balance = Over − Under`. A negative balance is money the supplier owes back (price support); **Cash Claim** button raises a rate-difference claim for `amount` (default |balance|) with remark "Rate difference {from} - {to}"; suppliers already claimed show their claim numbers.

## Retailers, routes, SR, DSR
- Retailer: code (auto-increment, e.g. 2710), name, name (Bangla), owner, NID, route, SR, mobile, email, opening balance, photo, address, remark. List shows balance; label format `code/ name/ mobile`.
- Route: name, description; retailer count. SR has a usual route (pre-fills on SR Sales Create).
- **SR Sales Create**: choose SR + route → opens the day's order session for that route's retailers; each retailer order becomes an invoice (INV-YYYY-NNNNN) with the same line maths as `01-sales-order.md`. Orders are **submitted** (pending) until **finalized**; Delivery Pending lists submitted, undelivered orders.
- SR receipt (10 cm print, Bangla): invoice no, date, route, shop, phone, address, SR, items (carton, piece, total, rate, amount), total sale, grand total payable, signatures, footer "ধন্যবাদ, আবার আসবেন".
- **SR Statement**: opening balance, then per invoice "Net receivable" debit, payments credit, running balance.
- **SR Balance**: total commission, total payments, due.

## SR targets
- Monthly target per SR (with remark); "copy previous month" fills each box with last month's target; total shown.
- **Target vs Achievement** (month): `Achieved = finalized sales (invoice total) of the SR in the month`; `Achievement % = achieved / target`; `Remaining = max(0, target − achieved)`; `Pending = submitted orders not finalized yet`; `Need/Day = remaining / days left in month` (to confirm); invoice count.

## Staff & payroll
- Staff: name, designation, NID, photo, parents, mobile, email, address, route, salary, joining date, opening balance, daily allowance per working day (default 100), own incentive tiers, assigned suppliers, optional login (role Staff/Manager/Admin).
- Salary: declare per staff per month → payables (Declared, Paid, Outstanding); pay with voucher + payslip; history by month/year/all.
- Attendance per day: Present / Absent / Late / Leave, in/out time. Leave: from, to, reason.
- **DSR payroll** (month): Monthly Sales, Working Days, `Daily Allowance = days × rate`, Basic Salary, **Incentive** (from tiers), `Total Earnings`, `Grand Total`. Policy defaults: basic 10,000; DA 100/day; tiers 600,000–800,000 → 2%, 800,000–1,000,000 → 3%, ≥ 1,000,000 → 3.5%. Each DSR can override. "Hover incentive for the per-tier breakdown" ⇒ **marginal (slab) tiers**, to confirm.

## Reports (all take From/To; some a party filter)
| Report | Columns / formula |
| --- | --- |
| Day Book | see `03-accounting-and-payments.md` |
| GRN Notes | GRN#, Date, Supplier, Invoice#, Subtotal, Commission, Transport, Payable, Paid, Due, Status |
| GRN Products | Date, GRN#, Supplier, Product, Category, Carton, Piece, Qty, Buy Price, Amount |
| Category / Product Wise Receive | Total Qty, Avg Price (= amount / qty), Total Amount |
| GRN Summary | per supplier: # GRN, Subtotal, Commission, Transport, Payable, Paid, Due |
| PO vs GRN | Ordered, Received, Pending (= ordered − received), Amount, Status |
| Daily Sales / DSR Wise Sales | Orders, Total, Commission, Payable, Paid, Due |
| Product Wise Sales | Sold Qty, Avg Price (= revenue / qty), Revenue, COGS, Gross Profit |
| Sales Summary | Orders, Grand Total, Commission, Cash Claim, Return Qty, Damage Qty, Cash Damage, Transport, DSR Cost, Payable, Paid, Due (Payable = Grand Total − deductions) |
| Stock Card | per product movements and running balance |
| DSR/SR/Retailer/Supplier Statement | opening, debits, credits, running balance |
| DSR/SR/Retailer/Supplier Balance | total sales or purchases, total payments, balance |
| Invoice Wise Profit | Revenue, COGS, Commission, Gross Profit (= revenue − COGS), Net Profit (= gross − commission) |
| Product / Category (Brand) / Supplier Wise Profit | Sold Qty, Revenue, COGS, Profit, `Margin% = profit / revenue` (1 dp) |
| Trial Balance, P&L, Balance Sheet, Ledger, Journal | standard double-entry |
| Expense Report | Date, Voucher, Category, Description, Account, Amount |
| Salary Sheet, Attendance Sheet | (no page in Rushda yet) |

## Dashboard
- Monthly sales: **Total** (gross invoice total), **Cash Sales**, **Due Sales** (= payable after deductions, e.g. cash damage). That is why Total ≠ Cash + Due.
- Supplier payments this month; Sales today; Cash received/paid today and cash balance (Σ cash/bank accounts); Supplier dues, Retailer dues, DSR balance, SR balance; SR target vs achievement; sales chart by day; account balances.
