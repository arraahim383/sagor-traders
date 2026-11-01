# Rushda → Sagor ERP: clone audit (2 Nov 2026)

Every Rushda menu item, where it is in the new ERP (`/erp`), and whether it matches. "Same" means the same fields and the same calculation. "Fixed" means the same screen but a Rushda bug corrected on purpose (see `05-findings-and-questions.md`).

## Menus and screens

| Rushda | Sagor ERP | Status |
| --- | --- | --- |
| Products: Product List (margin, stock) | Products → Product list | Same |
| Add Product (code, Bangla name, group unit, pcs/carton, buy/sale, opening stock, min stock, commission %) | Products → Add product | Same; photo not stored |
| Categories (product count) | Products → Categories | Same |
| Promotional Offers (several free options, start/end, applies to) | Products → Promotional offers | Same (up to 3 free options) |
| Create PO / PO List (ordered vs received) | Purchase Order | Same, incl. offers on POs |
| Goods Receive (free qty, sale price, commission, transport, paid/full, advance) / Receive Notes (mobile) | Goods Receive | Same calculation; commission → Discount Received, transport → Transport Expense (Fixed) |
| New Sales Order (carton/piece, return, damage, FIFO price, offers, deductions, split payment) | Sales & Order → New sales order | Same calculation |
| Draft Invoices | Sales & Order → Draft invoices | Same |
| SR Sales Create (SR + route session) | Sales & Order → SR sales create | Same |
| SR Sales Order list (route, retailer, damage, free) | Sales & Order → SR sales orders | Same |
| Delivery Pending (by retailer / by order) | Sales & Order → Delivery pending | Same |
| Reminders | Sales & Order → Reminders | Same |
| Over / Under Rate + Cash Claim button | Sales & Order → Over / under rate | Same |
| Sales Summary (item, CRT, PCS, return, damage, free, price, value) | Sales & Order → Sales summary | Same |
| SR receipt (10 cm, Bangla) | Sales invoice → "SR receipt (Bangla)" | Same |
| Supplier Stock / Low Stock | Stock | Same; stock = sum of FIFO lots (Fixed) |
| Stock Adjust (increase/decrease, damage, history) | Stock → Stock adjust | Same |
| Damage Claim / Claim Send List / Damage Recover | Stock | Same |
| DSR / SR / Retailer / Supplier Payment (ref invoice, less, route filter) | Payments | Same; open invoices also net later payments against them |
| Cash Claim / Claim Register (receive incl. Adjustment) | Payments | Same; claim settles once (Fixed) |
| Payment List | Payments → Payment list | Same |
| Accounts (chart, add account) | Accounts → Accounts | Same codes |
| Journal Voucher / Voucher List | Accounts | Same |
| Allowance for Bad Debts (% or fixed, write-off) | Accounts → Allowance for bad debts | Same |
| Transaction Entry / List / Transfer / Adjustment / Categories | Transaction | Same |
| DSR list / SR list / Retailers (balance, due memos) / Routes / Suppliers (balance, cash claim) | People | Same; one supplier balance everywhere (Fixed) |
| SR Monthly Target (copy previous) / Target vs Achievement (pending, need/day) | Target | Same |
| Add Staff (designation, salary, DA, own incentive tiers, opening balance) | Staff → Add staff | Same; photo and "assigned suppliers" not stored |
| Staff Salary / History / Payables / Payslip | Staff → Staff salary | Same |
| Attendance / Leave | Staff | Same |
| DSR Payroll / DSR Payroll Policy | Staff | Same (slab incentive by default; flat available) |
| Report Center (37 reports) | Reports | All present, plus item-wise sales summary |
| SMS: Send / Due / Bulk / Balance / API setup; Send Email | SMS & Email | Same; needs your Banglalink details; email opens your mail app |
| Users / Roles & Permissions / Company | Users & Setup | Same idea; users create their own password on first sign-in |

## Data carried over from Rushda (cut-over 31 Oct 2026)

| Data | In the ERP | Note |
| --- | --- | --- |
| Products (prices, pcs/carton, category, supplier, Bangla name, code) | 86 | Same |
| Stock as FIFO lots | 99 lots, 20,950 pcs, value 884,803.39 | Trimmed to the stock count on 22 products (Fixed) |
| Categories | 15 | Same |
| Suppliers | 2 (Godrej, Dabur) | Contact/mobile not in Rushda's list |
| Routes | 28 | Same |
| Retailers | 1,709 (1,684 with a route, 1,520 with a mobile) | Owner name and SR assignment were not in the exported list |
| SRs | 2 (Md. Abul Hasnat, Md. Shoukat Osman) | Rushda's only staff |
| DSRs | 0 | Rushda had none |
| Promotional offers | 0 | None were live in Rushda on 31 Oct |
| SR targets | 0 | October targets were blank in Rushda |
| Chart of accounts | 30 | Same codes + Operating Expenses |
| Expense categories | 14 | Same |
| Company details | Name, address, phone, receipt footer | Same |
| Balances, invoices, payments | Start at zero | Owner's decision; numbering starts at INV-2026-00001 |

## Not carried over

- Photos (products, retailers, staff, users).
- Staff "assigned suppliers".
- Users and passwords from Rushda: add each person under Users & Setup; they set their own password.
- History before 31 Oct (old invoices, payments, journal): kept in Rushda.

To fill any of the small gaps above (retailer owners or SR assignments, supplier phones, minimum stock per product), sign in to Rushda in the browser and the values can be read and copied across.
