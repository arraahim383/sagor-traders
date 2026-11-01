-- ERP access is its own list: website staff (admins/editors) plus anyone on erp_user_roles.
-- ERP-only users can work in the ERP but get no rights over the website's tables.

create or replace function private.is_erp_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff s where s.email = lower(coalesce(auth.jwt() ->> 'email', '')))
      or exists (select 1 from public.erp_user_roles r where r.email = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
grant execute on function private.is_erp_user() to authenticated;

-- Every ERP table: swap the staff-only policy for the ERP-user policy.
do $$
declare t record;
begin
  for t in select tablename from pg_policies where schemaname = 'public' and tablename like 'erp\_%' and policyname = 'staff only' loop
    execute format('drop policy "staff only" on public.%I', t.tablename);
    execute format('create policy "erp users" on public.%I for all to authenticated using ((select private.is_erp_user())) with check ((select private.is_erp_user()))', t.tablename);
  end loop;
end $$;

-- The posting functions check the caller the same way.
do $$
declare f record; def text;
begin
  for f in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('erp_post', 'erp_post_sale') loop
    def := pg_get_functiondef(f.oid);
    execute replace(def, 'private.is_staff()', 'private.is_erp_user()');
  end loop;
end $$;

-- Module access: website admins and ERP administrators see everything; website editors default to manager;
-- ERP-only users get their role's modules; anyone else gets nothing.
create or replace function public.erp_my_modules() returns text[]
language plpgsql stable security definer set search_path = '' as $$
declare v_email text := lower(coalesce(auth.jwt() ->> 'email', '')); v_site text; v_role text; v_mods jsonb;
begin
  select role into v_site from public.staff where email = v_email;
  if v_site = 'admin' then return null; end if;
  select role into v_role from public.erp_user_roles where email = v_email;
  if v_site is null and v_role is null then return array[]::text[]; end if;
  v_role := coalesce(v_role, 'manager');
  if v_role = 'administrator' then return null; end if;
  select value -> v_role into v_mods from public.erp_settings where key = 'roles';
  if v_mods is null then return array['home']; end if;
  return array(select jsonb_array_elements_text(v_mods));
end;
$$;

-- Only ERP administrators (or website admins) may change who has which role, or what each role can open.
create or replace function private.is_erp_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select (select public.erp_my_modules()) is null and (select private.is_erp_user());
$$;
grant execute on function private.is_erp_admin() to authenticated;

drop policy "erp users" on public.erp_user_roles;
create policy "erp users read" on public.erp_user_roles for select to authenticated using ((select private.is_erp_user()));
create policy "erp admins write" on public.erp_user_roles for all to authenticated using ((select private.is_erp_admin())) with check ((select private.is_erp_admin()));

drop policy "erp users" on public.erp_settings;
create policy "erp users read" on public.erp_settings for select to authenticated using ((select private.is_erp_user()));
create policy "erp users write" on public.erp_settings for insert to authenticated
  with check ((select private.is_erp_user()) and (key not in ('roles', 'sms') or (select private.is_erp_admin())));
create policy "erp users update" on public.erp_settings for update to authenticated
  using ((select private.is_erp_user()) and (key not in ('roles', 'sms') or (select private.is_erp_admin())))
  with check ((select private.is_erp_user()) and (key not in ('roles', 'sms') or (select private.is_erp_admin())));
create policy "erp admins delete" on public.erp_settings for delete to authenticated using ((select private.is_erp_admin()));
