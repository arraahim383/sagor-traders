# Findings in Rushda's own numbers, and decisions needed

From Rushda's reports on 2026-10-31. These need a decision before we copy the logic "exactly", because copying it exactly would also copy these.

## 1. Inventory account is negative: −264,183.47
An inventory value can't be below zero. The most likely cause: opening stock was entered as a quantity on each product but never posted to the books (Dr Inventory / Cr Owner's Capital). Every sale since then has taken cost out of Inventory that was never put in.
**Our build:** opening stock posts its value to Inventory against Owner's Capital (opening balance equity).

## 2. October shows a gross loss of −18,868 (COGS 395,126 > sales 376,259)
Two separate causes:
- **Genuine under-rate selling**: SRs sell below the list price (Under 62,389 vs Over 1,807 in October). Rushda tracks this as a claim on the supplier (Godrej −52,169, Dabur −8,413), but the claim only reaches the books when someone raises it.
- **Unit mistakes in product data**, e.g. **HIT CHALK**: cost ৳209.50 per piece but sold at ৳18.50 per piece (invoice INV-2026-01066 shows a ৳2,386 loss on a ৳582 sale). The cost was probably entered per box, not per piece.
- Same kind of typo the other way: **Shampoo Color Mini Pack Burgendy** sale price 277 against cost 25.70 (should be 27).
**Our build:** same maths, plus a warning when a line's price is below cost, or more than 3× away from it (likely a piece/carton mix-up), so these are caught at entry.

## 3. FIFO lots don't match stock on 22 of 86 products
e.g. PHD 3grm: stock 1,176 but lots hold 1,644; GK Refill: 179 vs 249; HIT CHALK: 72 vs 96. Possibly orders that are submitted but not finalized reduce stock before they consume lots (29 orders were "Delivery Pending"), or some stock movements don't touch lots.
**Our build:** stock is always the sum of remaining lots, so the two can never disagree; reserved (pending) qty is shown separately.

## 4. Supplier balance doesn't match the books
Supplier Balance report: 82,594 payable. Accounts Payable account: 112,627.72. The difference, 30,033.72, is almost exactly Damage Claim Receivable (30,034), so claims are netted in the report but not in the ledger.
**Our build:** one supplier balance everywhere = payable − claims receivable, with both shown.

## 5. Retailer dues don't match the books
Retailer Balance report: 8,932. Accounts Receivable account: 8,431.80 (difference 500.20).

## 6. Damage Loss account is negative (−8,869)
More has been credited to Damage Loss (recoveries/claims) than debited (damage written off).

## Decisions needed from you
1. **Copy exactly, or copy and fix?** Recommended: identical screens, workflow and formulas, with the accounting fixed as above.
2. **Moving data across.** Start on a cut-over date (e.g. 1st of next month) with: products and current stock (with cost), 1,710 retailers, routes, suppliers, SRs/DSRs, and each party's opening balance from Rushda. Or start empty?
3. **DSR incentive tiers**: slab (2% only on the part between 600k–800k, 3% on 800k–1M, …) or flat (whole month's sales at the tier reached)?
4. **Need / Day** on targets: remaining ÷ days left in the month including today, or working days only (excluding Fridays)?
5. **Who logs in**: just office staff, or SRs and DSRs on their phones too (as in Rushda's SR/DSR roles)?
6. **SMS**: keep Banglalink corporate SMS (needs your API username/password/CLI), or leave SMS out for now?
