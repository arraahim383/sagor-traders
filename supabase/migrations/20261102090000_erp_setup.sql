-- ERP users & roles, SMS log, and the module access check used by the menu and the route guard.

create table public.erp_user_roles (
  email text primary key,
  name text,
  phone text,
  role text not null default 'manager' check (role in ('administrator', 'manager', 'staff', 'sr', 'dsr')),
  updated_at timestamptz not null default now()
);

create table public.erp_sms_log (
  id bigint generated always as identity primary key,
  sent_at timestamptz not null default now(),
  kind text not null default 'single',
  numbers text[] not null,
  message text not null,
  status text not null,
  response text,
  sent_by text default lower(coalesce(auth.jwt() ->> 'email', ''))
);

do $$
declare t text;
begin
  foreach t in array array['erp_user_roles', 'erp_sms_log'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "staff only" on public.%I for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()))', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- Default module access per role (editable on the Roles page). Administrators always see everything.
insert into public.erp_settings (key, value) values
  ('roles', '{
    "manager": ["home","products","purchase","receive","sales","stock","payments","accounts","transaction","people","target","staff","reports","sms"],
    "staff":   ["home","products","purchase","receive","sales","stock","payments","transaction","people","reports"],
    "sr":      ["home","sales","target"],
    "dsr":     ["home","sales"]
  }'::jsonb),
  ('payroll_policy', '{"basicSalary":10000,"dailyAllowance":100,"tiers":[{"min":600000,"max":800000,"rate":2},{"min":800000,"max":1000000,"rate":3},{"min":1000000,"max":null,"rate":3.5}]}'::jsonb)
on conflict (key) do nothing;

-- Modules the signed-in user may open: null = everything, empty = nothing.
-- Website admins and ERP administrators get everything; anyone on the staff list without an ERP role is treated as a manager.
create or replace function public.erp_my_modules() returns text[]
language plpgsql stable security definer set search_path = '' as $$
declare v_email text := lower(coalesce(auth.jwt() ->> 'email', '')); v_site text; v_role text; v_mods jsonb;
begin
  select role into v_site from public.staff where email = v_email;
  if v_site is null then return array[]::text[]; end if;
  if v_site = 'admin' then return null; end if;
  select role into v_role from public.erp_user_roles where email = v_email;
  v_role := coalesce(v_role, 'manager');
  if v_role = 'administrator' then return null; end if;
  select value -> v_role into v_mods from public.erp_settings where key = 'roles';
  if v_mods is null then return array['home']; end if;
  return array(select jsonb_array_elements_text(v_mods));
end;
$$;
revoke all on function public.erp_my_modules() from public, anon;
grant execute on function public.erp_my_modules() to authenticated;

-- Item-wise sales summary (Rushda's Sales & Order → Sales Summary), optionally for one SR and/or route.
create or replace function public.erp_rpt_sales_items(p_from date, p_to date, p_sr bigint default null, p_route bigint default null)
returns table (product_id bigint, product text, per int, qty numeric, return_qty numeric, damage_qty numeric, free_qty numeric, revenue numeric)
language sql stable security invoker set search_path = '' as $$
  select p.id, p.name, p.per, sum(l.sold_qty), sum(l.return_qty), sum(l.damage_qty), sum(l.free_qty), sum(l.subtotal)
  from public.erp_sales_lines l
  join public.erp_sales_orders o on o.id = l.order_id and o.status = 'finalized' and o.date between p_from and p_to
  join public.erp_products p on p.id = l.product_id
  left join public.erp_retailers r on r.id = o.retailer_id
  where (p_sr is null or o.sr_id = p_sr) and (p_route is null or r.route_id = p_route)
  group by p.id
  order by p.name;
$$;
revoke all on function public.erp_rpt_sales_items(date, date, bigint, bigint) from public, anon;
grant execute on function public.erp_rpt_sales_items(date, date, bigint, bigint) to authenticated;

-- Who owes the invoice follows the order type: direct sales → the retailer, otherwise the SR (or DSR).
create or replace view public.erp_open_invoices with (security_invoker = true) as
  select o.id, o.invoice_no, o.date, o.sr_id, o.dsr_id, o.retailer_id,
    round(o.payable - o.paid - coalesce(p.amt, 0), 2) as due,
    case when o.type = 'direct' then 'retailer' when o.sr_id is not null then 'sr' else 'dsr' end as party_type,
    case when o.type = 'direct' then o.retailer_id when o.sr_id is not null then o.sr_id else o.dsr_id end as party_id
  from public.erp_sales_orders o
  left join (select ref_invoice, sum(amount + less) amt from public.erp_payments where direction = 'in' and ref_invoice is not null group by ref_invoice) p
    on p.ref_invoice = o.invoice_no
  where o.status = 'finalized' and o.payable - o.paid - coalesce(p.amt, 0) > 0.005;
