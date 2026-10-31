-- Sagor Traders business system (replacement for Rushda DMS): master data, FIFO stock, double-entry books, sales.
-- Staff-only: nothing here is readable by website visitors.

create table public.erp_categories (
  id bigint generated always as identity primary key,
  name text not null unique
);

create table public.erp_suppliers (
  id bigint generated always as identity primary key,
  rushda_id int unique,
  name text not null unique,
  contact_person text,
  address text,
  mobile text,
  created_at timestamptz not null default now()
);

create table public.erp_routes (
  id bigint generated always as identity primary key,
  rushda_id int unique,
  name text not null unique,
  description text
);

-- SRs, DSRs and office staff.
create table public.erp_staff (
  id bigint generated always as identity primary key,
  rushda_id int,
  kind text not null check (kind in ('sr', 'dsr', 'staff')),
  name text not null,
  designation text,
  mobile text,
  route_id bigint references public.erp_routes (id),
  salary numeric(14, 2) not null default 0,
  daily_allowance numeric(14, 2) not null default 100,
  incentive_tiers jsonb,
  active boolean not null default true,
  unique (kind, rushda_id)
);

create table public.erp_retailers (
  id bigint generated always as identity primary key,
  rushda_id int unique,
  code text not null unique,
  name text not null,
  name_bn text,
  owner_name text,
  nid text,
  route_id bigint references public.erp_routes (id),
  sr_id bigint references public.erp_staff (id),
  mobile text,
  email text,
  address text,
  remark text,
  active boolean not null default true
);
create index on public.erp_retailers (route_id);

create table public.erp_products (
  id bigint generated always as identity primary key,
  rushda_id int unique,
  code text unique,
  barcode text,
  name text not null,
  name_bn text,
  category_id bigint references public.erp_categories (id),
  supplier_id bigint references public.erp_suppliers (id),
  group_unit text not null default 'CTN',
  per int not null default 12 check (per > 0),
  unit text not null default 'PCS',
  buy_price numeric(14, 4) not null default 0,
  sale_price numeric(14, 4) not null default 0,
  min_stock numeric(14, 3) not null default 0,
  commission_pct numeric(6, 2) not null default 0,
  active boolean not null default true
);

-- FIFO lots. Stock on hand is always the sum of qty_left (never stored separately, so it can't drift).
create table public.erp_lots (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.erp_products (id),
  received_on date not null,
  qty numeric(14, 3) not null check (qty >= 0),
  qty_left numeric(14, 3) not null check (qty_left >= 0),
  rate numeric(14, 4) not null default 0,
  sale numeric(14, 4) not null default 0,
  source text not null,
  source_id bigint
);
create index on public.erp_lots (product_id, received_on, id) where qty_left > 0;

create table public.erp_stock_moves (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.erp_products (id),
  lot_id bigint references public.erp_lots (id),
  date date not null,
  qty numeric(14, 3) not null,
  rate numeric(14, 4) not null default 0,
  source text not null,
  source_id bigint,
  note text,
  created_at timestamptz not null default now()
);
create index on public.erp_stock_moves (product_id, date);

create table public.erp_accounts (
  id bigint generated always as identity primary key,
  code text not null unique,
  key text unique,
  name text not null,
  type text not null check (type in ('asset', 'liability', 'equity', 'income', 'expense')),
  is_cash boolean not null default false,
  system boolean not null default false,
  active boolean not null default true
);

create table public.erp_journals (
  id bigint generated always as identity primary key,
  date date not null,
  voucher_no text not null unique,
  narration text,
  source text not null,
  source_id bigint,
  created_by text default lower(coalesce(auth.jwt() ->> 'email', '')),
  created_at timestamptz not null default now()
);
create index on public.erp_journals (date);

create table public.erp_journal_lines (
  id bigint generated always as identity primary key,
  journal_id bigint not null references public.erp_journals (id) on delete cascade,
  account_id bigint not null references public.erp_accounts (id),
  debit numeric(14, 2) not null default 0 check (debit >= 0),
  credit numeric(14, 2) not null default 0 check (credit >= 0),
  party_type text check (party_type in ('retailer', 'sr', 'dsr', 'supplier')),
  party_id bigint,
  check (debit = 0 or credit = 0)
);
create index on public.erp_journal_lines (account_id);
create index on public.erp_journal_lines (party_type, party_id);

-- Every journal must balance; checked when the transaction commits.
create or replace function private.erp_check_journal_balanced() returns trigger
language plpgsql set search_path = '' as $$
declare d numeric; c numeric; jid bigint := coalesce(new.journal_id, old.journal_id);
begin
  select coalesce(sum(debit), 0), coalesce(sum(credit), 0) into d, c from public.erp_journal_lines where journal_id = jid;
  if d <> c then
    raise exception 'Journal % is not balanced (debit %, credit %)', jid, d, c;
  end if;
  return null;
end;
$$;
create constraint trigger erp_journal_balanced after insert or update or delete on public.erp_journal_lines
  deferrable initially deferred for each row execute function private.erp_check_journal_balanced();

create table public.erp_claims (
  id bigint generated always as identity primary key,
  claim_no text not null unique,
  date date not null,
  supplier_id bigint not null references public.erp_suppliers (id),
  type text not null default 'Rate Difference',
  period_from date,
  period_to date,
  claimed numeric(14, 2) not null,
  received numeric(14, 2) not null default 0,
  remark text
);

create sequence public.erp_invoice_seq;

create table public.erp_sales_orders (
  id bigint generated always as identity primary key,
  invoice_no text not null unique,
  date date not null,
  type text not null check (type in ('dsr', 'direct', 'return')),
  status text not null default 'draft' check (status in ('draft', 'finalized')),
  sr_id bigint references public.erp_staff (id),
  dsr_id bigint references public.erp_staff (id),
  retailer_id bigint references public.erp_retailers (id),
  total numeric(14, 2) not null default 0,
  commission numeric(14, 2) not null default 0,
  cash_claim numeric(14, 2) not null default 0,
  cash_damage numeric(14, 2) not null default 0,
  transport numeric(14, 2) not null default 0,
  dsr_cost numeric(14, 2) not null default 0,
  discount numeric(14, 2) not null default 0,
  payable numeric(14, 2) not null default 0,
  paid numeric(14, 2) not null default 0,
  cost numeric(14, 2) not null default 0,
  payment_mode text,
  remark text,
  journal_id bigint references public.erp_journals (id),
  created_by text default lower(coalesce(auth.jwt() ->> 'email', '')),
  created_at timestamptz not null default now(),
  finalized_at timestamptz
);
create index on public.erp_sales_orders (date);

create table public.erp_sales_lines (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.erp_sales_orders (id) on delete cascade,
  product_id bigint not null references public.erp_products (id),
  carton int not null default 0,
  piece int not null default 0,
  return_qty int not null default 0,
  damage_qty int not null default 0,
  free_qty numeric(14, 3) not null default 0,
  sold_qty numeric(14, 3) not null default 0,
  price numeric(14, 4) not null default 0,
  manual boolean not null default false,
  subtotal numeric(14, 2) not null default 0,
  cost numeric(14, 2) not null default 0,
  is_free boolean not null default false
);

create table public.erp_sale_payments (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.erp_sales_orders (id) on delete cascade,
  account_id bigint not null references public.erp_accounts (id),
  amount numeric(14, 2) not null check (amount > 0)
);

create table public.erp_settings (
  key text primary key,
  value jsonb not null
);

-- Read models
create view public.erp_product_stock with (security_invoker = true) as
  select p.id as product_id, coalesce(sum(l.qty_left), 0) as stock
  from public.erp_products p left join public.erp_lots l on l.product_id = p.id
  group by p.id;

create view public.erp_party_balances with (security_invoker = true) as
  select party_type, party_id, sum(debit - credit) as balance
  from public.erp_journal_lines where party_type is not null
  group by party_type, party_id;

create view public.erp_account_balances with (security_invoker = true) as
  select a.id, a.code, a.name, a.type, a.is_cash, coalesce(sum(l.debit - l.credit), 0) as balance
  from public.erp_accounts a left join public.erp_journal_lines l on l.account_id = a.id
  group by a.id;

-- Staff-only access to everything above.
do $$
declare t text;
begin
  foreach t in array array['erp_categories','erp_suppliers','erp_routes','erp_staff','erp_retailers','erp_products','erp_lots',
    'erp_stock_moves','erp_accounts','erp_journals','erp_journal_lines','erp_claims','erp_sales_orders','erp_sales_lines',
    'erp_sale_payments','erp_settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "staff only" on public.%I for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()))', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
revoke all on public.erp_product_stock, public.erp_party_balances, public.erp_account_balances from anon;
grant select on public.erp_product_stock, public.erp_party_balances, public.erp_account_balances to authenticated;
grant usage on sequence public.erp_invoice_seq to authenticated;

-- Rushda's chart of accounts, same codes.
insert into public.erp_accounts (code, key, name, type, is_cash, system) values
  ('1000', 'cash', 'Cash', 'asset', true, true),
  ('1010', 'bank', 'Bank', 'asset', true, true),
  ('1020', 'bkash', 'bKash-01777940795', 'asset', true, true),
  ('1030', 'nagad', 'Nagad-01777940795', 'asset', true, true),
  ('1100', 'inventory', 'Inventory', 'asset', false, true),
  ('1200', 'arRetailers', 'Accounts Receivable — Retailers', 'asset', false, true),
  ('1210', 'dsrControl', 'DSR Control', 'asset', false, true),
  ('1220', 'srControl', 'SR Control', 'asset', false, true),
  ('1300', 'damageClaimReceivable', 'Damage Claim Receivable', 'asset', false, true),
  ('1350', 'fixedAssets', 'Fixed Assets (at cost)', 'asset', false, true),
  ('1360', 'accumulatedDepreciation', 'Accumulated Depreciation', 'asset', false, true),
  ('1370', 'allowanceDoubtful', 'Allowance for Doubtful Accounts', 'asset', false, true),
  ('2000', 'apSuppliers', 'Accounts Payable — Suppliers', 'liability', false, true),
  ('2100', 'salaryPayable', 'Salary Payable', 'liability', false, true),
  ('3000', 'ownersCapital', 'Owner''s Capital', 'equity', false, true),
  ('3100', 'cashBankAdjustment', 'Cash/Bank Adjustment', 'equity', false, true),
  ('3900', 'retainedEarnings', 'Retained Earnings', 'equity', false, true),
  ('4000', 'salesRevenue', 'Sales Revenue', 'income', false, true),
  ('4100', 'discountReceived', 'Discount Received', 'income', false, true),
  ('4200', 'inventoryAdjustment', 'Inventory Adjustment', 'income', false, true),
  ('4900', 'otherIncome', 'Other Income', 'income', false, true),
  ('5000', 'cogs', 'Cost of Goods Sold', 'expense', false, true),
  ('5100', 'commissionExpense', 'Commission Expense', 'expense', false, true),
  ('5200', 'transportExpense', 'Transport Expense', 'expense', false, true),
  ('5300', 'damageLoss', 'Damage Loss', 'expense', false, true),
  ('5400', 'discountAllowed', 'Discount Allowed', 'expense', false, true),
  ('5500', 'badDebtExpense', 'Bad Debt Expense', 'expense', false, true),
  ('6000', 'salaryExpense', 'Salary Expense', 'expense', false, true),
  ('6100', 'depreciationExpense', 'Depreciation Expense', 'expense', false, true);
