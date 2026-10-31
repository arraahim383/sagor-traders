-- Remaining Rushda modules: purchasing, goods receive, payments, claims, damage, stock adjust, cash book,
-- targets, staff (attendance, leave, salary), bad debts, promotions, reminders; plus one posting routine.

alter table public.erp_staff
  add column if not exists nid text,
  add column if not exists email text,
  add column if not exists address text,
  add column if not exists father_name text,
  add column if not exists mother_name text,
  add column if not exists joining_date date;
alter table public.erp_staff drop constraint if exists erp_staff_kind_check;
alter table public.erp_staff add constraint erp_staff_kind_check check (kind in ('sr', 'dsr', 'staff'));

alter table public.erp_journal_lines drop constraint if exists erp_journal_lines_party_type_check;
alter table public.erp_journal_lines add constraint erp_journal_lines_party_type_check
  check (party_type in ('retailer', 'sr', 'dsr', 'supplier', 'staff'));

insert into public.erp_accounts (code, key, name, type, is_cash, system) values
  ('6200', 'operatingExpenses', 'Operating Expenses', 'expense', false, true)
on conflict (code) do nothing;

-- Voucher numbers per prefix and year: PO-2026-00001, GRN-2026-00001, PAY-…, CLM-…, DMG-…, ADJ-…, JV-…, CB-…, SAL-…, BD-…
create table public.erp_counters (
  prefix text not null,
  year int not null,
  n int not null default 0,
  primary key (prefix, year)
);

create table public.erp_purchase_orders (
  id bigint generated always as identity primary key,
  po_no text not null unique,
  date date not null,
  supplier_id bigint not null references public.erp_suppliers (id),
  subtotal numeric(14, 2) not null default 0,
  remark text,
  status text not null default 'open' check (status in ('open', 'received', 'closed')),
  journal_id bigint,
  created_at timestamptz not null default now()
);
create table public.erp_purchase_order_lines (
  id bigint generated always as identity primary key,
  po_id bigint not null references public.erp_purchase_orders (id) on delete cascade,
  product_id bigint not null references public.erp_products (id),
  carton int not null default 0,
  piece int not null default 0,
  qty numeric(14, 3) not null,
  buy_price numeric(14, 4) not null default 0,
  subtotal numeric(14, 2) not null default 0,
  is_free boolean not null default false,
  received_qty numeric(14, 3) not null default 0
);

create table public.erp_goods_receipts (
  id bigint generated always as identity primary key,
  grn_no text not null unique,
  date date not null,
  supplier_id bigint not null references public.erp_suppliers (id),
  invoice_no text,
  po_id bigint references public.erp_purchase_orders (id),
  subtotal numeric(14, 2) not null default 0,
  commission numeric(14, 2) not null default 0,
  transport numeric(14, 2) not null default 0,
  payable numeric(14, 2) not null default 0,
  paid numeric(14, 2) not null default 0,
  advance_applied numeric(14, 2) not null default 0,
  account_id bigint references public.erp_accounts (id),
  mode text,
  journal_id bigint,
  created_at timestamptz not null default now()
);
create table public.erp_goods_receipt_lines (
  id bigint generated always as identity primary key,
  grn_id bigint not null references public.erp_goods_receipts (id) on delete cascade,
  product_id bigint not null references public.erp_products (id),
  carton int not null default 0,
  piece int not null default 0,
  qty numeric(14, 3) not null default 0,
  free_qty numeric(14, 3) not null default 0,
  buy_price numeric(14, 4) not null default 0,
  sale_price numeric(14, 4) not null default 0,
  subtotal numeric(14, 2) not null default 0,
  is_free boolean not null default false
);

-- Money in from retailers/SR/DSR and money out to suppliers/staff.
create table public.erp_payments (
  id bigint generated always as identity primary key,
  voucher_no text not null unique,
  date date not null,
  party_type text not null check (party_type in ('retailer', 'sr', 'dsr', 'supplier', 'staff')),
  party_id bigint not null,
  direction text not null check (direction in ('in', 'out')),
  amount numeric(14, 2) not null default 0,
  less numeric(14, 2) not null default 0,
  account_id bigint references public.erp_accounts (id),
  mode text,
  ref_invoice text,
  remark text,
  journal_id bigint,
  created_at timestamptz not null default now()
);
create index on public.erp_payments (party_type, party_id);

alter table public.erp_claims
  add column if not exists journal_id bigint,
  add column if not exists status text not null default 'Outstanding';
create table public.erp_claim_lines (
  id bigint generated always as identity primary key,
  claim_id bigint not null references public.erp_claims (id) on delete cascade,
  product_id bigint not null references public.erp_products (id),
  qty numeric(14, 3) not null,
  price numeric(14, 4) not null default 0,
  subtotal numeric(14, 2) not null default 0
);
create table public.erp_claim_receipts (
  id bigint generated always as identity primary key,
  claim_id bigint not null references public.erp_claims (id),
  date date not null,
  amount numeric(14, 2) not null check (amount > 0),
  account_id bigint references public.erp_accounts (id),
  mode text,
  remark text,
  journal_id bigint
);

-- Damaged goods taken out of sellable stock (from the stock-adjust screen); claimable from the supplier.
create table public.erp_damage_notes (
  id bigint generated always as identity primary key,
  note_no text not null unique,
  date date not null,
  kind text not null default 'damage' check (kind in ('damage', 'reduce', 'recover')),
  product_id bigint not null references public.erp_products (id),
  qty numeric(14, 3) not null check (qty > 0),
  rate numeric(14, 4) not null default 0,
  amount numeric(14, 2) not null default 0,
  remark text,
  journal_id bigint,
  created_at timestamptz not null default now()
);

create table public.erp_stock_adjustments (
  id bigint generated always as identity primary key,
  adj_no text not null unique,
  date date not null,
  product_id bigint not null references public.erp_products (id),
  direction text not null check (direction in ('in', 'out')),
  qty numeric(14, 3) not null check (qty > 0),
  rate numeric(14, 4) not null default 0,
  amount numeric(14, 2) not null default 0,
  reason text,
  journal_id bigint,
  created_at timestamptz not null default now()
);

create table public.erp_cash_categories (
  id bigint generated always as identity primary key,
  name text not null unique,
  kind text not null check (kind in ('income', 'expense', 'transfer'))
);
create table public.erp_cash_entries (
  id bigint generated always as identity primary key,
  voucher_no text not null unique,
  date date not null,
  kind text not null check (kind in ('receive', 'payment', 'transfer', 'adjustment')),
  account_id bigint not null references public.erp_accounts (id),
  to_account_id bigint references public.erp_accounts (id),
  category_id bigint references public.erp_cash_categories (id),
  description text,
  ref_no text,
  amount numeric(14, 2) not null check (amount > 0),
  direction text check (direction in ('increase', 'decrease')),
  journal_id bigint,
  created_at timestamptz not null default now()
);

create table public.erp_sr_targets (
  id bigint generated always as identity primary key,
  sr_id bigint not null references public.erp_staff (id),
  month date not null,
  target numeric(14, 2) not null default 0,
  remark text,
  unique (sr_id, month)
);

create table public.erp_attendance (
  id bigint generated always as identity primary key,
  staff_id bigint not null references public.erp_staff (id),
  date date not null,
  status text not null check (status in ('present', 'absent', 'late', 'leave')),
  time_in time,
  time_out time,
  unique (staff_id, date)
);
create table public.erp_leaves (
  id bigint generated always as identity primary key,
  staff_id bigint not null references public.erp_staff (id),
  from_date date not null,
  to_date date not null,
  reason text
);
create table public.erp_salary_declarations (
  id bigint generated always as identity primary key,
  voucher_no text not null unique,
  staff_id bigint not null references public.erp_staff (id),
  month date not null,
  amount numeric(14, 2) not null check (amount > 0),
  breakdown jsonb,
  journal_id bigint,
  unique (staff_id, month)
);

create table public.erp_bad_debts (
  id bigint generated always as identity primary key,
  voucher_no text not null unique,
  date date not null,
  kind text not null check (kind in ('estimate', 'writeoff')),
  party_type text check (party_type in ('retailer', 'sr', 'dsr')),
  party_id bigint,
  amount numeric(14, 2) not null,
  note text,
  journal_id bigint
);

create table public.erp_promotions (
  id bigint generated always as identity primary key,
  name text not null,
  product_id bigint references public.erp_products (id),
  basis text not null default 'qty' check (basis in ('qty', 'value')),
  target_qty numeric(14, 3),
  target_amount numeric(14, 2),
  free_options jsonb not null default '[]',
  starts_on date,
  ends_on date,
  applies_to text not null default 'sales' check (applies_to in ('sales', 'purchase', 'both')),
  active boolean not null default true
);

create table public.erp_reminders (
  id bigint generated always as identity primary key,
  remind_on date not null,
  title text not null,
  retailer_id bigint references public.erp_retailers (id),
  staff_id bigint references public.erp_staff (id),
  order_id bigint references public.erp_sales_orders (id),
  amount numeric(14, 2),
  note text,
  done boolean not null default false
);

do $$
declare t text;
begin
  foreach t in array array['erp_counters','erp_purchase_orders','erp_purchase_order_lines','erp_goods_receipts','erp_goods_receipt_lines',
    'erp_payments','erp_claim_lines','erp_claim_receipts','erp_damage_notes','erp_stock_adjustments','erp_cash_categories','erp_cash_entries',
    'erp_sr_targets','erp_attendance','erp_leaves','erp_salary_declarations','erp_bad_debts','erp_promotions','erp_reminders'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "staff only" on public.%I for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()))', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

insert into public.erp_cash_categories (name, kind) values
  ('Bank Charges', 'expense'), ('Bank Transaction', 'transfer'), ('Collection Bill', 'expense'), ('Daily Allowance', 'expense'),
  ('Delivery Fee', 'expense'), ('Electricity Bill', 'expense'), ('Entertainment Expense', 'expense'), ('Internet Bill', 'expense'),
  ('Labour Expense', 'expense'), ('Office Rent', 'expense'), ('Mobile Bill', 'expense'), ('Fuel & Transport', 'expense'),
  ('Other Expense', 'expense'), ('Other Income', 'income')
on conflict (name) do nothing;

-- Next voucher number for a prefix, e.g. erp_next_no('GRN', date '2026-11-01') → 'GRN-2026-00001'.
create or replace function private.erp_next_no(p_prefix text, p_date date) returns text
language plpgsql security invoker set search_path = '' as $$
declare v int;
begin
  insert into public.erp_counters (prefix, year, n) values (p_prefix, extract(year from p_date)::int, 1)
  on conflict (prefix, year) do update set n = public.erp_counters.n + 1
  returning n into v;
  return p_prefix || '-' || extract(year from p_date)::int || '-' || lpad(v::text, 5, '0');
end;
$$;

-- Take qty out of a product's lots, oldest first. Returns the FIFO cost. Refuses if there isn't enough.
create or replace function private.erp_issue_stock(p_product bigint, p_qty numeric, p_date date, p_source text, p_source_id bigint)
returns numeric language plpgsql security invoker set search_path = '' as $$
declare v_need numeric := p_qty; v_take numeric; v_cost numeric := 0; v_lot record; v_name text;
begin
  if p_qty <= 0 then return 0; end if;
  for v_lot in select id, qty_left, rate from public.erp_lots where product_id = p_product and qty_left > 0 order by received_on, id for update loop
    exit when v_need <= 0;
    v_take := least(v_lot.qty_left, v_need);
    update public.erp_lots set qty_left = qty_left - v_take where id = v_lot.id;
    insert into public.erp_stock_moves (product_id, lot_id, date, qty, rate, source, source_id) values (p_product, v_lot.id, p_date, -v_take, v_lot.rate, p_source, p_source_id);
    v_cost := v_cost + v_take * v_lot.rate;
    v_need := v_need - v_take;
  end loop;
  if v_need > 0 then
    select name into v_name from public.erp_products where id = p_product;
    raise exception '"%": not enough stock (short by %)', v_name, v_need;
  end if;
  return v_cost;
end;
$$;

-- Put qty into stock as a new lot.
create or replace function private.erp_add_stock(p_product bigint, p_qty numeric, p_rate numeric, p_sale numeric, p_date date, p_source text, p_source_id bigint)
returns bigint language plpgsql security invoker set search_path = '' as $$
declare v_lot bigint;
begin
  if p_qty <= 0 then return null; end if;
  insert into public.erp_lots (product_id, received_on, qty, qty_left, rate, sale, source, source_id)
  values (p_product, p_date, p_qty, p_qty, p_rate, p_sale, p_source, p_source_id) returning id into v_lot;
  insert into public.erp_stock_moves (product_id, lot_id, date, qty, rate, source, source_id) values (p_product, v_lot, p_date, p_qty, p_rate, p_source, p_source_id);
  return v_lot;
end;
$$;

/*
  One posting routine for every non-sales document. Everything happens in one transaction:
    doc        {table, prefix, number_column, row}   → inserted, numbered (PREFIX-YYYY-NNNNN)
    lines      {table, fk, rows[]}                     → inserted with the doc id
    stock      [{op: in|out, product_id, qty, rate, sale, tag}] → lots added / issued oldest-first; out-costs summed per tag
    journal    [{account, debit, credit, party_type, party_id}] where an amount may be "$cost:<tag>" (the FIFO cost just issued)
    updates    whitelisted follow-ups (PO received qty, claim received)
*/
create or replace function public.erp_post(p jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  allowed text[] := array['erp_purchase_orders','erp_goods_receipts','erp_payments','erp_claims','erp_claim_receipts','erp_damage_notes',
    'erp_stock_adjustments','erp_cash_entries','erp_salary_declarations','erp_bad_debts','erp_journals_manual'];
  allowed_lines text[] := array['erp_purchase_order_lines','erp_goods_receipt_lines','erp_claim_lines'];
  v_date date := (p ->> 'date')::date;
  v_table text := p #>> '{doc,table}';
  v_row jsonb := coalesce(p #> '{doc,row}', '{}'::jsonb);
  v_no text;
  v_id bigint;
  v_cols text;
  v_line jsonb;
  v_s jsonb;
  v_costs jsonb := '{}'::jsonb;
  v_cost numeric;
  v_tag text;
  v_jid bigint;
  v_j jsonb;
  v_debit numeric;
  v_credit numeric;
  v_has_lines boolean := false;
begin
  if not (select private.is_staff()) then raise exception 'Only staff can post'; end if;
  if v_table is null or not (v_table = any (allowed)) then raise exception 'Unknown document %', v_table; end if;

  v_no := private.erp_next_no(p #>> '{doc,prefix}', v_date);

  if v_table <> 'erp_journals_manual' then
    v_row := v_row || jsonb_build_object(p #>> '{doc,number_column}', v_no);
    select string_agg(quote_ident(k), ', ') into v_cols from jsonb_object_keys(v_row) k;
    execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, $1) returning id', v_table, v_cols, v_cols, v_table)
      using v_row into v_id;
  end if;

  if p ? 'lines' then
    if not ((p #>> '{lines,table}') = any (allowed_lines)) then raise exception 'Unknown lines table'; end if;
    for v_line in select * from jsonb_array_elements(p #> '{lines,rows}') loop
      v_line := v_line || jsonb_build_object(p #>> '{lines,fk}', v_id);
      select string_agg(quote_ident(k), ', ') into v_cols from jsonb_object_keys(v_line) k;
      execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, $1)', p #>> '{lines,table}', v_cols, v_cols, p #>> '{lines,table}')
        using v_line;
      v_has_lines := true;
    end loop;
  end if;

  for v_s in select * from jsonb_array_elements(coalesce(p -> 'stock', '[]'::jsonb)) loop
    if v_s ->> 'op' = 'in' then
      perform private.erp_add_stock((v_s ->> 'product_id')::bigint, (v_s ->> 'qty')::numeric, coalesce((v_s ->> 'rate')::numeric, 0),
        coalesce((v_s ->> 'sale')::numeric, 0), v_date, v_table, v_id);
    elsif v_s ->> 'op' = 'out' then
      v_cost := private.erp_issue_stock((v_s ->> 'product_id')::bigint, (v_s ->> 'qty')::numeric, v_date, v_table, v_id);
      v_tag := coalesce(v_s ->> 'tag', 'cost');
      v_costs := v_costs || jsonb_build_object(v_tag, coalesce((v_costs ->> v_tag)::numeric, 0) + v_cost);
    end if;
  end loop;

  if jsonb_array_length(coalesce(p -> 'journal', '[]'::jsonb)) > 0 then
    insert into public.erp_journals (date, voucher_no, narration, source, source_id)
    values (v_date, v_no, p ->> 'narration', v_table, v_id) returning id into v_jid;
    for v_j in select * from jsonb_array_elements(p -> 'journal') loop
      v_debit := case when v_j ->> 'debit' like '$cost:%' then round(coalesce((v_costs ->> substr(v_j ->> 'debit', 7))::numeric, 0), 2) else coalesce((v_j ->> 'debit')::numeric, 0) end;
      v_credit := case when v_j ->> 'credit' like '$cost:%' then round(coalesce((v_costs ->> substr(v_j ->> 'credit', 7))::numeric, 0), 2) else coalesce((v_j ->> 'credit')::numeric, 0) end;
      if v_debit > 0 or v_credit > 0 then
        insert into public.erp_journal_lines (journal_id, account_id, debit, credit, party_type, party_id)
        select v_jid, a.id, v_debit, v_credit, nullif(v_j ->> 'party_type', ''), nullif(v_j ->> 'party_id', '')::bigint
        from public.erp_accounts a where a.key = v_j ->> 'account' or a.code = v_j ->> 'account';
        if not found then raise exception 'Unknown account %', v_j ->> 'account'; end if;
      end if;
    end loop;
    if v_id is not null then
      execute format('update public.%I set journal_id = $1 where id = $2', v_table) using v_jid, v_id;
    end if;
  end if;

  -- Follow-ups
  if v_table = 'erp_goods_receipts' and (v_row ->> 'po_id') is not null then
    update public.erp_purchase_order_lines pol set received_qty = pol.received_qty + x.qty
    from (select (r ->> 'product_id')::bigint product_id, sum((r ->> 'qty')::numeric + coalesce((r ->> 'free_qty')::numeric, 0)) qty
          from jsonb_array_elements(p #> '{lines,rows}') r group by 1) x
    where pol.po_id = (v_row ->> 'po_id')::bigint and pol.product_id = x.product_id;
    update public.erp_purchase_orders po set status = case when not exists (
      select 1 from public.erp_purchase_order_lines l where l.po_id = po.id and l.received_qty < l.qty) then 'received' else 'open' end
    where po.id = (v_row ->> 'po_id')::bigint;
  end if;
  if v_table = 'erp_claim_receipts' then
    update public.erp_claims c set received = c.received + (v_row ->> 'amount')::numeric,
      status = case when c.claimed - (c.received + (v_row ->> 'amount')::numeric) <= 0.005 then 'Settled' else 'Outstanding' end
    where c.id = (v_row ->> 'claim_id')::bigint;
  end if;

  return jsonb_build_object('id', v_id, 'number', v_no, 'journal_id', v_jid, 'costs', v_costs, 'lines', v_has_lines);
end;
$$;
revoke all on function public.erp_post(jsonb) from public, anon;
grant execute on function public.erp_post(jsonb) to authenticated;
revoke all on function private.erp_next_no(text, date), private.erp_issue_stock(bigint, numeric, date, text, bigint),
  private.erp_add_stock(bigint, numeric, numeric, numeric, date, text, bigint) from public;
grant execute on function private.erp_next_no(text, date), private.erp_issue_stock(bigint, numeric, date, text, bigint),
  private.erp_add_stock(bigint, numeric, numeric, numeric, date, text, bigint) to authenticated;

-- Sales: also take damaged pieces out of sellable stock (they come back damaged and become claimable).
create or replace function public.erp_post_sale(p jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_order_id bigint := nullif(p ->> 'order_id', '')::bigint;
  v_status text := p ->> 'status';
  v_invoice text;
  v_line jsonb;
  v_line_id bigint;
  v_line_cost numeric;
  v_dmg_cost numeric;
  v_total_cost numeric := 0;
  v_total_dmg numeric := 0;
  v_journal_id bigint;
  v_date date := (p ->> 'date')::date;
begin
  if not (select private.is_staff()) then raise exception 'Only staff can save sales orders'; end if;
  if v_status not in ('draft', 'finalized') then raise exception 'Unknown status %', v_status; end if;

  if v_order_id is null then
    v_invoice := 'INV-' || to_char(v_date, 'YYYY') || '-' || lpad(nextval('public.erp_invoice_seq')::text, 5, '0');
    insert into public.erp_sales_orders (invoice_no, date, type, status) values (v_invoice, v_date, p ->> 'type', 'draft') returning id into v_order_id;
  else
    select invoice_no into v_invoice from public.erp_sales_orders where id = v_order_id and status = 'draft' for update;
    if v_invoice is null then raise exception 'Only draft orders can be changed'; end if;
    delete from public.erp_sales_lines where order_id = v_order_id;
    delete from public.erp_sale_payments where order_id = v_order_id;
  end if;

  update public.erp_sales_orders set
    date = v_date, type = p ->> 'type',
    sr_id = nullif(p ->> 'sr_id', '')::bigint, dsr_id = nullif(p ->> 'dsr_id', '')::bigint, retailer_id = nullif(p ->> 'retailer_id', '')::bigint,
    total = (p ->> 'total')::numeric, commission = (p ->> 'commission')::numeric, cash_claim = (p ->> 'cash_claim')::numeric,
    cash_damage = (p ->> 'cash_damage')::numeric, transport = (p ->> 'transport')::numeric, dsr_cost = (p ->> 'dsr_cost')::numeric,
    discount = (p ->> 'discount')::numeric, payable = (p ->> 'payable')::numeric, paid = (p ->> 'paid')::numeric,
    payment_mode = p ->> 'payment_mode', remark = nullif(p ->> 'remark', '')
  where id = v_order_id;

  for v_line in select * from jsonb_array_elements(p -> 'lines') loop
    insert into public.erp_sales_lines (order_id, product_id, carton, piece, return_qty, damage_qty, free_qty, sold_qty, price, manual, subtotal, is_free)
    values (v_order_id, (v_line ->> 'product_id')::bigint, (v_line ->> 'carton')::int, (v_line ->> 'piece')::int,
      (v_line ->> 'return_qty')::int, (v_line ->> 'damage_qty')::int, (v_line ->> 'free_qty')::numeric, (v_line ->> 'sold_qty')::numeric,
      (v_line ->> 'price')::numeric, (v_line ->> 'manual')::boolean, (v_line ->> 'subtotal')::numeric, coalesce((v_line ->> 'is_free')::boolean, false))
    returning id into v_line_id;

    if v_status = 'finalized' then
      v_line_cost := private.erp_issue_stock((v_line ->> 'product_id')::bigint, (v_line ->> 'sold_qty')::numeric + (v_line ->> 'free_qty')::numeric, v_date, 'sale', v_order_id);
      v_dmg_cost := private.erp_issue_stock((v_line ->> 'product_id')::bigint, (v_line ->> 'damage_qty')::numeric, v_date, 'sale_damage', v_order_id);
      update public.erp_sales_lines set cost = round(v_line_cost, 2) where id = v_line_id;
      v_total_cost := v_total_cost + v_line_cost;
      v_total_dmg := v_total_dmg + v_dmg_cost;
    end if;
  end loop;

  insert into public.erp_sale_payments (order_id, account_id, amount)
  select v_order_id, a.id, (x ->> 'amount')::numeric
  from jsonb_array_elements(coalesce(p -> 'payments', '[]'::jsonb)) x
  join public.erp_accounts a on a.key = x ->> 'account' and a.is_cash
  where (x ->> 'amount')::numeric > 0;

  if v_status = 'finalized' then
    insert into public.erp_journals (date, voucher_no, narration, source, source_id)
    values (v_date, v_invoice, coalesce(nullif(p ->> 'narration', ''), 'Sale ' || v_invoice), 'sale', v_order_id) returning id into v_journal_id;
    insert into public.erp_journal_lines (journal_id, account_id, debit, credit, party_type, party_id)
    select v_journal_id, a.id, (x ->> 'debit')::numeric, (x ->> 'credit')::numeric, nullif(x ->> 'party_type', ''), nullif(x ->> 'party_id', '')::bigint
    from jsonb_array_elements(p -> 'journal') x join public.erp_accounts a on a.key = x ->> 'account'
    where (x ->> 'debit')::numeric > 0 or (x ->> 'credit')::numeric > 0;
    if round(v_total_cost, 2) > 0 then
      insert into public.erp_journal_lines (journal_id, account_id, debit, credit) values
        (v_journal_id, (select id from public.erp_accounts where key = 'cogs'), round(v_total_cost, 2), 0),
        (v_journal_id, (select id from public.erp_accounts where key = 'inventory'), 0, round(v_total_cost, 2));
    end if;
    if round(v_total_dmg, 2) > 0 then
      insert into public.erp_journal_lines (journal_id, account_id, debit, credit) values
        (v_journal_id, (select id from public.erp_accounts where key = 'damageLoss'), round(v_total_dmg, 2), 0),
        (v_journal_id, (select id from public.erp_accounts where key = 'inventory'), 0, round(v_total_dmg, 2));
    end if;
    update public.erp_sales_orders set status = 'finalized', cost = round(v_total_cost, 2), journal_id = v_journal_id, finalized_at = now() where id = v_order_id;
  end if;

  return jsonb_build_object('order_id', v_order_id, 'invoice_no', v_invoice, 'status', v_status, 'cost', round(v_total_cost, 2), 'damage_cost', round(v_total_dmg, 2));
end;
$$;

-- Damaged stock waiting to be claimed from suppliers.
create view public.erp_damage_stock with (security_invoker = true) as
  with dmg as (
    select product_id, sum(damage_qty) qty from public.erp_sales_lines l join public.erp_sales_orders o on o.id = l.order_id
    where o.status = 'finalized' group by product_id
    union all
    select product_id, sum(case kind when 'damage' then qty else -qty end) from public.erp_damage_notes group by product_id
  ), claimed as (
    select cl.product_id, sum(cl.qty) qty from public.erp_claim_lines cl group by cl.product_id
  )
  select p.id product_id, coalesce((select sum(qty) from dmg where dmg.product_id = p.id), 0) damaged,
    coalesce((select qty from claimed where claimed.product_id = p.id), 0) claimed
  from public.erp_products p;
grant select on public.erp_damage_stock to authenticated;
revoke all on public.erp_damage_stock from anon;

-- Claim receipts get their own voucher number.
alter table public.erp_claim_receipts add column if not exists voucher_no text unique;

-- One row per product with stock, stock value and unclaimed damage.
create view public.erp_stock_list with (security_invoker = true) as
  select p.id, p.name, p.name_bn, p.code, p.per, p.buy_price, p.sale_price, p.min_stock, p.active,
    c.name as category, s.name as supplier, p.supplier_id, p.category_id,
    coalesce(l.stock, 0) as stock, coalesce(l.value, 0) as value,
    coalesce(d.damaged, 0) - coalesce(d.claimed, 0) as damaged_unclaimed
  from public.erp_products p
  left join public.erp_categories c on c.id = p.category_id
  left join public.erp_suppliers s on s.id = p.supplier_id
  left join (select product_id, sum(qty_left) stock, round(sum(qty_left * rate), 2) value from public.erp_lots group by product_id) l on l.product_id = p.id
  left join public.erp_damage_stock d on d.product_id = p.id;
grant select on public.erp_stock_list to authenticated;
revoke all on public.erp_stock_list from anon;
