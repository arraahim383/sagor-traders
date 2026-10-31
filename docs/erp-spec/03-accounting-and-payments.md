# Accounting, payments & cash book

Captured read-only from Rushda on 2026-10-31 (accounts list, journal, trial balance, P&L, balance sheet, payment forms).

## Chart of accounts (all "system" accounts)
| Code | Account | Type | Cash/Bank |
| --- | --- | --- | --- |
| 1000 | Cash | asset | yes |
| 1010 | Bank | asset | yes |
| 1020 | bKash-01777940795 | asset | yes |
| 1030 | Nagad-01777940795 | asset | yes |
| 1100 | Inventory | asset | |
| 1200 | Accounts Receivable — Retailers | asset | |
| 1210 | DSR Control | asset | |
| 1220 | SR Control | asset | |
| 1300 | Damage Claim Receivable | asset | |
| 1350 | Fixed Assets (at cost) | asset | |
| 1360 | Accumulated Depreciation | asset (contra) | |
| 1370 | Allowance for Doubtful Accounts | asset (contra) | |
| 2000 | Accounts Payable — Suppliers | liability | |
| 2100 | Salary Payable | liability | |
| 3000 | Owner's Capital | equity | |
| 3100 | Cash/Bank Adjustment | equity | |
| 3900 | Retained Earnings | equity | |
| 4000 | Sales Revenue | income | |
| 4100 | Discount Received | income | |
| 4200 | Inventory Adjustment | income | |
| 4900 | Other Income | income | |
| 5000 | Cost of Goods Sold | expense | |
| 5100 | Commission Expense | expense | |
| 5200 | Transport Expense | expense | |
| 5300 | Damage Loss | expense | |
| 5400 | Discount Allowed | expense | |
| 5500 | Bad Debt Expense | expense | |
| 6000 | Salary Expense | expense | |
| 6100 | Depreciation Expense | expense | |

Users can add accounts (name, type, cash/bank flag). Cash/bank accounts are the ones offered in every "Account / Pay From / Receive Into" picker.

## Postings observed in the Journal Book
| Event | Debit | Credit |
| --- | --- | --- |
| Sale via SR (or DSR) | SR Control (or DSR Control) = payable; Damage Loss = cash damage | Sales Revenue = total |
| Direct sale to retailer | Accounts Receivable — Retailers = payable | Sales Revenue = total |
| …every sale also | Cost of Goods Sold = FIFO cost of sold qty | Inventory |
| Paid at sale | Cash/Bank/bKash/Nagad (split rows allowed) | SR/DSR Control or AR |
| Goods receive | Inventory = payable | Accounts Payable — Suppliers |
| Payment received from SR/DSR/retailer | Cash/bank = amount; Discount Allowed = **less** | SR/DSR Control or AR = amount + less |
| Payment to supplier | Accounts Payable = amount + less | Cash/bank = amount; Discount Received = less |
| Damage / rate-difference claim raised | Damage Claim Receivable | Other Income |
| Claim money received | Cash/bank | Damage Claim Receivable |
| Journal voucher | as entered | as entered |

Rounding: money to 2 dp; quantities to 3 dp; rates to 4 dp.
Example: `Cash 178,083.00 + Discount Allowed 0.04 / SR Control 178,083.04`.

Still to confirm (not visible in the journal for October): exact accounts used for commission, transport, DSR cost, discount and cash claim deducted on a sale; supplier commission/transport on a GRN; salary; depreciation; stock adjustments; bad-debt allowance and write-off.

## Payments
- **DSR / SR / Retailer payment** (money in): party → shows live balance; optional **reference invoice** (lists that party's invoices with due; picking one fills the amount with that invoice's due; SR form also records `apply_to` = due type); **amount**; **less** (default 0); date; account; mode (Cash / Bank Transfer / Mobile Banking); remark. Retailer form can filter retailers by route.
- **Supplier payment** (money out): supplier → balance; cash payment; less; date; account; remark.
- **Cash Claim** (on a supplier): amount, paid, date, remark.
- **Claim Register**: each claim (damage claim, rate-difference claim, cash claim) has Claimed, Received, Due, Status (Outstanding / Settled). **Receive** a claim: amount (defaults to and capped at its due), date, account, mode (incl. Adjustment), remark.
- **Payment List**: Date, Voucher #, Type, Party, Direction (in/out), Amount, Less, Account, Ref. invoice.

## Journal voucher
Lines of (account, debit, credit); typing a debit clears that line's credit and vice versa. Totals rounded to 2 dp; must balance ("Not balanced — difference of X" otherwise).

## Bad debts
- **Estimate allowance**: `target = totalReceivables × percent / 100` (default 2%) or a fixed amount; `adjustment = target − currentAllowance` (shown + in red when the allowance must grow).
- **Write off**: party type Retailer/DSR/SR; only parties with a positive balance are listed; amount defaults to (and is capped at) their balance.
- totalReceivables on 2026-10-31 was 39,687.40 (= Retailer AR 8,431.80 + SR Control 31,255.60).

## Cash book (Transaction module)
- **Entry**: date, cash/bank account, category, description, voucher no, type Receive/Payment, amount.
- **Categories** have kind Income / Expense / Transfer. In use: Bank Charges, Bank Transaction (transfer), Collection Bill, Daily Allowance, Delivery Fee, Electricity Bill, Entertainment Expense, Internet Bill, Labour Expense, …
- **Transfer** between two cash/bank accounts (category, note, date). **Adjustment**: one account, Increase/Decrease, amount (posts against 3100 Cash/Bank Adjustment).
- **Day Book** (per date): invoices sold, total sales, paid at sale, due created; expenses by category; per account Opening / Received / Paid / Closing; receipts and payments by voucher.

## Reports confirmed
Trial Balance (code, account, debit, credit, totals equal), Profit & Loss (income accounts vs expense accounts), Balance Sheet (assets vs liabilities + equity, with current-period profit/loss line and a "balanced" check), Ledger (per account, period), Journal Book.
