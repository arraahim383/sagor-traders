-- Report aggregates. Summing in the database keeps reports right after years of data
-- (the API caps plain selects at 1,000 rows). All functions run as the caller, so the staff-only RLS still applies.

-- Per account: balance before the period, and debits/credits inside it.
create or replace function public.erp_rpt_accounts(p_from date, p_to date)
returns table (id bigint, code text, name text, type text, is_cash boolean, opening numeric, debit numeric, credit numeric)
language sql stable security invoker set search_path = '' as $$
  select a.id, a.code, a.name, a.type, a.is_cash, coalesce(x.opening, 0), coalesce(x.debit, 0), coalesce(x.credit, 0)
  from public.erp_accounts a
  left join (
    select l.account_id,
      sum(l.debit - l.credit) filter (where j.date < p_from) opening,
      sum(l.debit) filter (where j.date >= p_from) debit,
      sum(l.credit) filter (where j.date >= p_from) credit
    from public.erp_journal_lines l join public.erp_journals j on j.id = l.journal_id
    where j.date <= p_to
    group by l.account_id
  ) x on x.account_id = a.id
  order by a.code;
$$;

-- Finalized sales lines grouped by product, category or supplier.
create or replace function public.erp_rpt_sales_lines(p_from date, p_to date, p_by text)
returns table (key bigint, label text, qty numeric, free_qty numeric, return_qty numeric, damage_qty numeric, revenue numeric, cost numeric)
language sql stable security invoker set search_path = '' as $$
  select
    case p_by when 'category' then p.category_id when 'supplier' then p.supplier_id else p.id end,
    case p_by when 'category' then coalesce(c.name, 'No category') when 'supplier' then coalesce(s.name, 'No supplier') else p.name end,
    sum(l.sold_qty), sum(l.free_qty), sum(l.return_qty), sum(l.damage_qty), sum(l.subtotal), sum(l.cost)
  from public.erp_sales_lines l
  join public.erp_sales_orders o on o.id = l.order_id and o.status = 'finalized' and o.date between p_from and p_to
  join public.erp_products p on p.id = l.product_id
  left join public.erp_categories c on c.id = p.category_id
  left join public.erp_suppliers s on s.id = p.supplier_id
  group by 1, 2
  order by 7 desc;
$$;

-- Finalized orders grouped by day, DSR, SR, retailer, route or invoice.
create or replace function public.erp_rpt_sales_orders(p_from date, p_to date, p_by text)
returns table (key text, label text, orders bigint, total numeric, commission numeric, cash_claim numeric, cash_damage numeric,
  transport numeric, dsr_cost numeric, discount numeric, payable numeric, paid numeric, cost numeric, return_qty numeric, damage_qty numeric)
language sql stable security invoker set search_path = '' as $$
  with o as (
    select o.*, (select coalesce(sum(return_qty), 0) from public.erp_sales_lines where order_id = o.id) rq,
      (select coalesce(sum(damage_qty), 0) from public.erp_sales_lines where order_id = o.id) dq
    from public.erp_sales_orders o where o.status = 'finalized' and o.date between p_from and p_to
  )
  select
    case p_by when 'day' then o.date::text when 'dsr' then o.dsr_id::text when 'sr' then o.sr_id::text
      when 'retailer' then o.retailer_id::text when 'route' then r.route_id::text when 'invoice' then o.id::text else 'all' end,
    case p_by when 'day' then o.date::text when 'dsr' then coalesce(d.name, 'No DSR') when 'sr' then coalesce(sr.name, 'No SR')
      when 'retailer' then coalesce(r.code || ' - ' || r.name, 'Walk-in') when 'route' then coalesce(rt.name, 'No route')
      when 'invoice' then o.invoice_no else 'All sales' end,
    count(*), sum(o.total), sum(o.commission), sum(o.cash_claim), sum(o.cash_damage), sum(o.transport), sum(o.dsr_cost),
    sum(o.discount), sum(o.payable), sum(o.paid), sum(o.cost), sum(o.rq), sum(o.dq)
  from o
  left join public.erp_staff d on d.id = o.dsr_id
  left join public.erp_staff sr on sr.id = o.sr_id
  left join public.erp_retailers r on r.id = o.retailer_id
  left join public.erp_routes rt on rt.id = r.route_id
  group by 1, 2
  order by 1;
$$;

-- Over / under rate: sold price vs the product's list sale price, per supplier and product.
create or replace function public.erp_rpt_rate_diff(p_from date, p_to date)
returns table (supplier_id bigint, supplier text, product_id bigint, product text, price numeric, list_price numeric, qty numeric, over numeric, under numeric)
language sql stable security invoker set search_path = '' as $$
  select p.supplier_id, coalesce(s.name, 'No supplier'), p.id, p.name, l.price, p.sale_price, sum(l.sold_qty),
    round(greatest(sum((l.price - p.sale_price) * l.sold_qty), 0), 2),
    round(greatest(-sum((l.price - p.sale_price) * l.sold_qty), 0), 2)
  from public.erp_sales_lines l
  join public.erp_sales_orders o on o.id = l.order_id and o.status = 'finalized' and o.date between p_from and p_to
  join public.erp_products p on p.id = l.product_id
  left join public.erp_suppliers s on s.id = p.supplier_id
  where not l.is_free and l.sold_qty > 0 and l.price <> p.sale_price
  group by p.supplier_id, s.name, p.id, p.name, l.price, p.sale_price
  order by 2, 4;
$$;

-- Party balances: opening before the period, debits and credits inside it.
create or replace function public.erp_rpt_party(p_type text, p_from date, p_to date)
returns table (party_id bigint, opening numeric, debit numeric, credit numeric)
language sql stable security invoker set search_path = '' as $$
  select l.party_id,
    coalesce(sum(l.debit - l.credit) filter (where j.date < p_from), 0),
    coalesce(sum(l.debit) filter (where j.date >= p_from), 0),
    coalesce(sum(l.credit) filter (where j.date >= p_from), 0)
  from public.erp_journal_lines l join public.erp_journals j on j.id = l.journal_id
  where l.party_type = p_type and j.date <= p_to
  group by l.party_id;
$$;

-- One party's statement lines inside the period (opening comes from erp_rpt_party).
create or replace function public.erp_rpt_party_ledger(p_type text, p_id bigint, p_from date, p_to date)
returns table (date date, voucher_no text, narration text, source text, source_id bigint, debit numeric, credit numeric)
language sql stable security invoker set search_path = '' as $$
  select j.date, j.voucher_no, j.narration, j.source, j.source_id, sum(l.debit), sum(l.credit)
  from public.erp_journal_lines l join public.erp_journals j on j.id = l.journal_id
  where l.party_type = p_type and l.party_id = p_id and j.date between p_from and p_to
  group by j.id
  order by j.date, j.id;
$$;

-- Goods received grouped by product, category or supplier.
create or replace function public.erp_rpt_receive(p_from date, p_to date, p_by text)
returns table (key bigint, label text, notes bigint, qty numeric, free_qty numeric, amount numeric)
language sql stable security invoker set search_path = '' as $$
  select
    case p_by when 'category' then p.category_id when 'supplier' then g.supplier_id else p.id end,
    case p_by when 'category' then coalesce(c.name, 'No category') when 'supplier' then s.name else p.name end,
    count(distinct g.id),
    sum(case when l.is_free then 0 else l.qty end),
    sum(l.free_qty + case when l.is_free then l.qty else 0 end),
    sum(l.subtotal)
  from public.erp_goods_receipt_lines l
  join public.erp_goods_receipts g on g.id = l.grn_id and g.date between p_from and p_to
  join public.erp_products p on p.id = l.product_id
  left join public.erp_categories c on c.id = p.category_id
  join public.erp_suppliers s on s.id = g.supplier_id
  group by 1, 2
  order by 6 desc;
$$;

-- Free stock: free received on GRNs minus free given on sales.
create or replace function public.erp_rpt_free_stock()
returns table (product_id bigint, product text, received numeric, given numeric)
language sql stable security invoker set search_path = '' as $$
  with r as (
    select product_id, sum(free_qty + case when is_free then qty else 0 end) q from public.erp_goods_receipt_lines group by product_id
  ), g as (
    select l.product_id, sum(l.free_qty) q from public.erp_sales_lines l
    join public.erp_sales_orders o on o.id = l.order_id and o.status = 'finalized' group by l.product_id
  )
  select p.id, p.name, coalesce(r.q, 0), coalesce(g.q, 0)
  from public.erp_products p left join r on r.product_id = p.id left join g on g.product_id = p.id
  where coalesce(r.q, 0) <> 0 or coalesce(g.q, 0) <> 0
  order by p.name;
$$;

-- Cash book expenses grouped by category.
create or replace function public.erp_rpt_expense_categories(p_from date, p_to date)
returns table (category text, entries bigint, amount numeric)
language sql stable security invoker set search_path = '' as $$
  select coalesce(c.name, 'Uncategorised'), count(*), sum(e.amount)
  from public.erp_cash_entries e left join public.erp_cash_categories c on c.id = e.category_id
  where e.kind = 'payment' and e.date between p_from and p_to
  group by 1 order by 3 desc;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'erp_rpt_accounts(date, date)', 'erp_rpt_sales_lines(date, date, text)', 'erp_rpt_sales_orders(date, date, text)',
    'erp_rpt_rate_diff(date, date)', 'erp_rpt_party(text, date, date)', 'erp_rpt_party_ledger(text, bigint, date, date)',
    'erp_rpt_receive(date, date, text)', 'erp_rpt_free_stock()', 'erp_rpt_expense_categories(date, date)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- Invoices that still have money due: payable − paid at sale − later collections that referenced the invoice.
create or replace view public.erp_open_invoices with (security_invoker = true) as
  select o.id, o.invoice_no, o.date, o.sr_id, o.dsr_id, o.retailer_id,
    round(o.payable - o.paid - coalesce(p.amt, 0), 2) as due
  from public.erp_sales_orders o
  left join (select ref_invoice, sum(amount + less) amt from public.erp_payments where direction = 'in' and ref_invoice is not null group by ref_invoice) p
    on p.ref_invoice = o.invoice_no
  where o.status = 'finalized' and o.payable - o.paid - coalesce(p.amt, 0) > 0.005;
revoke all on public.erp_open_invoices from anon;
grant select on public.erp_open_invoices to authenticated;

-- One account's lines inside the period, in date order (opening comes from erp_rpt_accounts).
create or replace function public.erp_rpt_account_ledger(p_account bigint, p_from date, p_to date)
returns table (line_id bigint, date date, voucher_no text, narration text, party_type text, debit numeric, credit numeric)
language sql stable security invoker set search_path = '' as $$
  select l.id, j.date, j.voucher_no, j.narration, l.party_type, l.debit, l.credit
  from public.erp_journal_lines l join public.erp_journals j on j.id = l.journal_id
  where l.account_id = p_account and j.date between p_from and p_to
  order by j.date, j.id, l.id;
$$;
revoke all on function public.erp_rpt_account_ledger(bigint, date, date) from public, anon;
grant execute on function public.erp_rpt_account_ledger(bigint, date, date) to authenticated;
