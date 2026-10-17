-- Keep SECURITY DEFINER helpers out of the public API schema.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;
alter function public.is_staff() set schema private;
alter function public.is_admin() set schema private;
alter function public.touch_updated_at() set schema private;
revoke execute on function private.is_staff() from public;
revoke execute on function private.is_admin() from public;
grant execute on function private.is_staff() to anon, authenticated;
grant execute on function private.is_admin() to authenticated;
