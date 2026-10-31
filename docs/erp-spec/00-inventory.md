# Rushda DMS — module inventory

Captured read-only from sagor.rushdhadms.com on 2026-10-31 (every sidebar page, fetched as HTML; nothing submitted).
Detailed calculation specs live in the numbered files next to this one.

Cash/bank accounts in use: **Cash, Bank, bKash-01777940795, Nagad-01777940795**.
Payment modes: Cash | Bkash | Nagad | Bank (sales); Cash | Bank Transfer | Mobile Banking (payments); + Adjustment (claim receive).

## Products
- **Product List**: Supplier, Category, Barcode, Name, Buy Price, Sale Price, **Margin**, Stock.
- **Add Product**: barcode, code, category*, name*, name (Bangla), supplier, group unit (e.g. Carton), **unit per group** (default 12), unit, **buy price***, sale price, **opening stock**, **min stock**, **commission %**, photo.
- **Categories**: name; list shows product count. In use: Bathroom Freshner, Good knight, HIT, Hair Oil, Handwash, Health Care, …
- Suppliers in use: Dabur Bangladesh Ltd, Godrej Household Products LTD.

## Purchase Order
- **Create PO**: date, PO no (auto), supplier, remark; lines: Product, Carton, Piece, QTY, Buy Price, Sub Total.
- **PO List**: PO #, Date, Supplier, Ordered Qty, **Received Qty**, Amount, Status.

## Goods Receive (stock in)
- **Goods Receive**: date, supplier invoice #, supplier; lines: Product, Carton, Piece, QTY, **Free Qty**, Buy Price, **Sale Price**, Sub Total; summary: **Commission**, **Transport**, **Paid** (+ Full), Pay From account, Mode. Creates a FIFO **lot** per product (qty, cost rate, sale price).
- **Receive Notes**: Invoice #, Date, Supplier, Mobile, Total, Paid, Due.

## Sales & Order
- **New Sales Order / Draft Invoices** → see `01-sales-order.md`. List: Order #, Date, Type, DSR, Retailer, Payable, Paid, Due.
- **SR Sales Create**: pick SR + Route → starts today's SR order session (per retailer on the route).
- **SR Sales Order list**: filters from/to/route/retailer; Order #, Date, Retailer, Route, SR, Amount, Damage Qty, Damage Amt, Free Qty, Status.
- **Delivery Pending**: grouped by retailer (Route, Orders, SR, Qty, Free Qty, Amount, Status) and by order (Order #, Date, DSR, Items, Free Qty, Order Value).
- **Reminders**: Date, Title, Retailer, DSR, Invoice, Amount, Status.
- **Over Rate / Under Rate** (period): per invoice line Actual Price vs Over Price / Under Price; per supplier Over, Under, **Balance**; button to raise a **rate-difference claim** (amount = Over − Under) against the supplier.
- **Sales Summary** (period, SR, route): Item, CRT, PCS, Total Qty, Return Qty, Damage Qty, Free Qty, Price, Total Value.

## Stock
- **Supplier Stock**, **Low Stock** (stock ≤ min stock): Supplier, Category, Product, Buy Price, Sale Price, Stock.
- **Stock Adjust**: per item Current Stock, Buy/Sale Price, Adjust Qty, Type (increase/decrease), Reason, Damage Qty, Rate; history (last 50): Increase, Decrease, Date, Reason.
- **Damage Claim**: per item Total Damaged, Already Claimed, Claim Qty, Price, Sub Total → claim sent to a supplier (date, remark).
- **Claim Send List**: Claim #, Date, Supplier, Qty, Amount, Status.
- **Damage Recover**: product, qty, date, remark (damaged goods recovered back to stock).

## Payments
- **Payment List** (period, type): Date, Voucher #, Type (Supplier/Retailer/DSR/SR), Party, **Direction**, Amount, **Less**, Account, Ref. Invoice.
- **DSR / SR / Retailer Payment** (money received from them): party, optional reference invoice (to clear a specific due invoice), **amount**, **less** (discount/write-down on settlement), date, account, mode, remark. Retailer: route filter + live balance.
- **Supplier Payment** (money paid out): supplier, balance shown, cash payment, less, date, account, remark.
- **Cash Claim**: supplier, amount, paid, date, remark.
- **Claim Register** (status Outstanding/Settled/All): Voucher, Date, Supplier, Type, Period, Claimed, Received, Due; receive a claim into an account (mode incl. Adjustment).

## Accounts (double entry)
- **Accounts**: code, name, type **Asset/Liability/Equity/Income/Expense**, cash/bank flag, balance, status.
- **Journal Voucher**: date, narration, lines Account / Debit / Credit (must balance).
- **Voucher List**: Voucher No, Date, Narration, Amount, Created By.
- **Allowance for Bad Debts**: estimate as **% of total receivables** (default 2%) or a fixed target amount; **write off** a receivable for a Retailer/DSR/SR (only parties with outstanding balance); history.

## Transaction (cash book)
- **Transaction Entry**: date, account, category, description, voucher no, type **Receive/Payment**, amount.
- **Transaction List**: Date, Voucher, Category, Type, Description, Account, Received, Paid.
- **Transfer** between accounts (with category, note) and **Adjustment** (account, Increase/Decrease).
- **Categories**: name, kind **Income/Expense/Transfer** (e.g. Bank Charges, Bank Transaction, Collection Bill, Daily Allowance, Delivery Fee).

## People
- **DSR list**, **SR list** (SRs in use: Md. Abul Hasnat, Md. Shoukat Osman).
- **Retailers**: code (auto, e.g. 2710), name, name (Bangla), owner, NID, route, SR, mobile, email, **opening balance**, photo, address, remark; list shows **Balance**; **Due Memos** (Memo No, Date, Invoice, Total, Paid, Due).
- **Routes**: name, description, retailer count (e.g. Baghabari, Balshabare, Beltola, Boalia Bazar, Daya Bazar, …).
- **Suppliers**: name, contact person, address, mobile, opening balance; list shows **Balance** and **Cash Claim**.

## Target
- **SR Monthly Target**: per SR per month: previous month's target, Target Amount, Achieved, %, Remark.
- **Target vs Achievement**: Target, Achieved, Achievement %, Remaining, **Pending**, **Need / Day**, Invoices.

## Staff
- **Add Staff**: name, designation (Managing Partner, Partner, Manager, Accountant, Supervisor, …), NID, photo, father/mother, mobile, email, address, route, **salary***, joining date, opening balance, **daily allowance per working day** (default 100), **incentive tiers** (per staff), assigned suppliers, optional login (email, password, role Staff/Manager/Admin).
- **Staff Salary**: staff, amount, month, date. **History** (by month/year/all): Voucher, Staff, Designation, Month, Date, Salary, Paid, Mode, Payslip. **Payables**: Declared, Paid, Outstanding.
- **Attendance**: per day per staff Present/Absent/Late/Leave, in/out time. **Leave**: staff, from, to, reason.
- **DSR Payroll** (month): DSR, Monthly Sales, Working Days, Daily Allowance, Basic Salary, **Incentive**, Total Earnings, Grand Total.
- **DSR Payroll Policy**: basic salary 10,000/month; daily allowance 100/working day; incentive tiers on monthly sales: 600,000–800,000 → 2%, 800,000–1,000,000 → 3%, ≥1,000,000 → 3.5%.

## Reports (Report Center, with date range)
Day Book · Goods Receive Note · Goods Receive Product · Category Wise Receive · Product Wise Receive · Goods Receive Summary · PO vs Goods Receive · Daily Sales · DSR Wise Sales · Product Wise Sales · Sales Summary · Over/Under Rate · Stock Card · Low Stock · Free Stock · DSR Statement · DSR Balance · SR Statement · SR Balance · SR Target vs Achievement · Journal Book · Ledger · Trial Balance · Expense Report · Retailer Statement · Retailer Balance · Supplier Statement · Supplier Balance · Salary Sheet · Attendance Sheet · Profit & Loss · Invoice Wise Profit · Product Wise Profit · Brand Wise Profit · Supplier Wise Profit · Balance Sheet · Bad Debts / Allowance.

## SMS & Email
Send SMS (numbers, message) · Due SMS (group Retailers/Suppliers/DSR) · Bulk SMS · Send Email · SMS Balance · SMS API setup (Banglalink corporate SMS: username, password, CLI, send URL, management URL, bill MSISDN).

## Users & Setup
- Users: name, email, password, phone, role (Administrator/DSR/Manager/SR), photo. Roles & Permissions: role, description, access.
- Company: logo, name (M/S Sagor Traders), address (Ullapara, Sirajgonj), phone (01901-658600), receipt footer (ধন্যবাদ, আবার আসবেন).
- Promotional Offers: Name, Product, Target, Free Product Option(s), Start, End, Applies To, Status.
