-- Saves a sales order and, when finalized, issues stock oldest-lot-first and posts its journal in one transaction.
-- The app computes line prices/totals with the shared calculation engine and sends the journal lines except
-- COGS/Inventory; the cost is worked out here from the real, locked lots so it can't drift from stock.
create or replace function public.erp_post_sale(p jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_order_id bigint := nullif(p ->> 'order_id', '')::bigint;
  v_status text := p ->> 'status';
  v_invoice text;
  v_line jsonb;
  v_line_id bigint;
  v_need numeric;
  v_take numeric;
  v_lot record;
  v_line_cost numeric;
  v_total_cost numeric := 0;
  v_journal_id bigint;
  v_date date := (p ->> 'date')::date;
begin
  if not (select private.is_staff()) then
    raise exception 'Only staff can save sales orders';
  end if;
  if v_status not in ('draft', 'finalized') then
    raise exception 'Unknown status %', v_status;
  end if;

  if v_order_id is null then
    v_invoice := 'INV-' || to_char(v_date, 'YYYY') || '-' || lpad(nextval('public.erp_invoice_seq')::text, 5, '0');
    insert into public.erp_sales_orders (invoice_no, date, type, status) values (v_invoice, v_date, p ->> 'type', 'draft')
    returning id into v_order_id;
  else
    select invoice_no into v_invoice from public.erp_sales_orders where id = v_order_id and status = 'draft' for update;
    if v_invoice is null then
      raise exception 'Only draft orders can be changed';
    end if;
    delete from public.erp_sales_lines where order_id = v_order_id;
    delete from public.erp_sale_payments where order_id = v_order_id;
  end if;

  update public.erp_sales_orders set
    date = v_date,
    type = p ->> 'type',
    sr_id = nullif(p ->> 'sr_id', '')::bigint,
    dsr_id = nullif(p ->> 'dsr_id', '')::bigint,
    retailer_id = nullif(p ->> 'retailer_id', '')::bigint,
    total = (p ->> 'total')::numeric,
    commission = (p ->> 'commission')::numeric,
    cash_claim = (p ->> 'cash_claim')::numeric,
    cash_damage = (p ->> 'cash_damage')::numeric,
    transport = (p ->> 'transport')::numeric,
    dsr_cost = (p ->> 'dsr_cost')::numeric,
    discount = (p ->> 'discount')::numeric,
    payable = (p ->> 'payable')::numeric,
    paid = (p ->> 'paid')::numeric,
    payment_mode = p ->> 'payment_mode',
    remark = nullif(p ->> 'remark', '')
  where id = v_order_id;

  for v_line in select * from jsonb_array_elements(p -> 'lines') loop
    insert into public.erp_sales_lines (order_id, product_id, carton, piece, return_qty, damage_qty, free_qty, sold_qty, price, manual, subtotal, is_free)
    values (v_order_id, (v_line ->> 'product_id')::bigint, (v_line ->> 'carton')::int, (v_line ->> 'piece')::int,
      (v_line ->> 'return_qty')::int, (v_line ->> 'damage_qty')::int, (v_line ->> 'free_qty')::numeric, (v_line ->> 'sold_qty')::numeric,
      (v_line ->> 'price')::numeric, (v_line ->> 'manual')::boolean, (v_line ->> 'subtotal')::numeric, coalesce((v_line ->> 'is_free')::boolean, false))
    returning id into v_line_id;

    if v_status = 'finalized' then
      -- Issue sold + free pieces from the oldest lots; refuse if there isn't enough.
      v_need := (v_line ->> 'sold_qty')::numeric + (v_line ->> 'free_qty')::numeric;
      v_line_cost := 0;
      for v_lot in
        select id, qty_left, rate from public.erp_lots
        where product_id = (v_line ->> 'product_id')::bigint and qty_left > 0
        order by received_on, id for update
      loop
        exit when v_need <= 0;
        v_take := least(v_lot.qty_left, v_need);
        update public.erp_lots set qty_left = qty_left - v_take where id = v_lot.id;
        insert into public.erp_stock_moves (product_id, lot_id, date, qty, rate, source, source_id)
        values ((v_line ->> 'product_id')::bigint, v_lot.id, v_date, -v_take, v_lot.rate, 'sale', v_order_id);
        v_line_cost := v_line_cost + v_take * v_lot.rate;
        v_need := v_need - v_take;
      end loop;
      if v_need > 0 then
        raise exception 'Not enough stock for product % (short by %)', v_line ->> 'product_id', v_need;
      end if;
      update public.erp_sales_lines set cost = round(v_line_cost, 2) where id = v_line_id;
      v_total_cost := v_total_cost + v_line_cost;
    end if;
  end loop;

  insert into public.erp_sale_payments (order_id, account_id, amount)
  select v_order_id, a.id, (x ->> 'amount')::numeric
  from jsonb_array_elements(coalesce(p -> 'payments', '[]'::jsonb)) x
  join public.erp_accounts a on a.key = x ->> 'account' and a.is_cash
  where (x ->> 'amount')::numeric > 0;

  if v_status = 'finalized' then
    insert into public.erp_journals (date, voucher_no, narration, source, source_id)
    values (v_date, v_invoice, coalesce(nullif(p ->> 'narration', ''), 'Sale ' || v_invoice), 'sale', v_order_id)
    returning id into v_journal_id;

    insert into public.erp_journal_lines (journal_id, account_id, debit, credit, party_type, party_id)
    select v_journal_id, a.id, (x ->> 'debit')::numeric, (x ->> 'credit')::numeric, nullif(x ->> 'party_type', ''), nullif(x ->> 'party_id', '')::bigint
    from jsonb_array_elements(p -> 'journal') x
    join public.erp_accounts a on a.key = x ->> 'account'
    where (x ->> 'debit')::numeric > 0 or (x ->> 'credit')::numeric > 0;

    if round(v_total_cost, 2) > 0 then
      insert into public.erp_journal_lines (journal_id, account_id, debit, credit) values
        (v_journal_id, (select id from public.erp_accounts where key = 'cogs'), round(v_total_cost, 2), 0),
        (v_journal_id, (select id from public.erp_accounts where key = 'inventory'), 0, round(v_total_cost, 2));
    end if;

    update public.erp_sales_orders
    set status = 'finalized', cost = round(v_total_cost, 2), journal_id = v_journal_id, finalized_at = now()
    where id = v_order_id;
  end if;

  return jsonb_build_object('order_id', v_order_id, 'invoice_no', v_invoice, 'status', v_status, 'cost', round(v_total_cost, 2));
end;
$$;

revoke all on function public.erp_post_sale(jsonb) from public, anon;
grant execute on function public.erp_post_sale(jsonb) to authenticated;
