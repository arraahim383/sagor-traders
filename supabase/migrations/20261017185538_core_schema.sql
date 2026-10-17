-- Sagor Traders: core content schema, security and media storage

create table public.staff (
  email text primary key check (email = lower(email)),
  role text not null default 'editor' check (role in ('admin', 'editor')),
  created_at timestamptz not null default now()
);

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff s
    where s.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff s
    where s.email = lower(coalesce(auth.jwt() ->> 'email', '')) and s.role = 'admin'
  );
$$;

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.site_settings (
  id smallint primary key default 1 check (id = 1),
  company_name text not null,
  logo_text text not null default 'Sagor Traders',
  logo_url text,
  hero_eyebrow text,
  hero_title text,
  hero_highlight text,
  hero_image_url text,
  about_eyebrow text default 'About Us',
  about_title text,
  about_intro text,
  about_body text,
  about_image_url text,
  stats jsonb not null default '[]'::jsonb,
  products_eyebrow text default 'Our Products',
  team_eyebrow text default 'Our Team',
  contact_eyebrow text default 'Contact Us',
  contact_title text default 'Get in Touch',
  contact_image_url text,
  phone text,
  whatsapp text,
  email text,
  address text,
  map_url text,
  facebook_url text,
  twitter_url text,
  youtube_url text,
  linkedin_url text,
  founded_year int,
  staff_count int,
  seo_title text,
  seo_description text,
  footer_credit text,
  updated_at timestamptz not null default now()
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  description text,
  company text not null default 'Marico Bangladesh',
  is_parent boolean not null default false,
  show_in_hero boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order int not null default 0
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  slug text not null unique,
  summary text,
  description text,
  pack_sizes text,
  price numeric(10, 2) check (price is null or price >= 0),
  image_url text,
  is_featured boolean not null default true,
  is_active boolean not null default true,
  in_stock boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_brand_idx on public.products (brand_id);
create index products_category_idx on public.products (category_id);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  phone text,
  photo_url text,
  sort_order int not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  image_url text,
  product_id uuid references public.products (id) on delete set null,
  starts_on date,
  ends_on date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
create index offers_product_idx on public.offers (product_id);

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'contact' check (kind in ('contact', 'product')),
  name text not null check (char_length(name) between 1 and 120),
  email text check (email is null or char_length(email) <= 200),
  phone text check (phone is null or char_length(phone) <= 40),
  shop_name text check (shop_name is null or char_length(shop_name) <= 160),
  area text check (area is null or char_length(area) <= 160),
  message text check (message is null or char_length(message) <= 4000),
  product_id uuid references public.products (id) on delete set null,
  product_name text check (product_name is null or char_length(product_name) <= 200),
  quantity text check (quantity is null or char_length(quantity) <= 120),
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  staff_note text,
  created_at timestamptz not null default now(),
  check (email is not null or phone is not null)
);
create index inquiries_product_idx on public.inquiries (product_id);
create index inquiries_status_created_idx on public.inquiries (status, created_at desc);

create trigger site_settings_touch before update on public.site_settings
  for each row execute function public.touch_updated_at();
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- Row level security
alter table public.staff enable row level security;
alter table public.site_settings enable row level security;
alter table public.brands enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.team_members enable row level security;
alter table public.offers enable row level security;
alter table public.inquiries enable row level security;

create policy "staff see staff" on public.staff for select to authenticated using ((select public.is_staff()));
create policy "admins add staff" on public.staff for insert to authenticated with check ((select public.is_admin()));
create policy "admins change staff" on public.staff for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins remove staff" on public.staff for delete to authenticated using ((select public.is_admin()));

create policy "public reads settings" on public.site_settings for select to anon, authenticated using (true);
create policy "staff edit settings" on public.site_settings for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

create policy "public reads brands" on public.brands for select to anon, authenticated using (true);
create policy "staff add brands" on public.brands for insert to authenticated with check ((select public.is_staff()));
create policy "staff edit brands" on public.brands for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff remove brands" on public.brands for delete to authenticated using ((select public.is_staff()));

create policy "public reads categories" on public.categories for select to anon, authenticated using (true);
create policy "staff add categories" on public.categories for insert to authenticated with check ((select public.is_staff()));
create policy "staff edit categories" on public.categories for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff remove categories" on public.categories for delete to authenticated using ((select public.is_staff()));

create policy "public reads active products" on public.products for select to anon, authenticated using (is_active or (select public.is_staff()));
create policy "staff add products" on public.products for insert to authenticated with check ((select public.is_staff()));
create policy "staff edit products" on public.products for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff remove products" on public.products for delete to authenticated using ((select public.is_staff()));

create policy "public reads visible team" on public.team_members for select to anon, authenticated using (is_visible or (select public.is_staff()));
create policy "staff add team" on public.team_members for insert to authenticated with check ((select public.is_staff()));
create policy "staff edit team" on public.team_members for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff remove team" on public.team_members for delete to authenticated using ((select public.is_staff()));

create policy "public reads live offers" on public.offers for select to anon, authenticated using (
  (is_active and (starts_on is null or starts_on <= current_date) and (ends_on is null or ends_on >= current_date))
  or (select public.is_staff())
);
create policy "staff add offers" on public.offers for insert to authenticated with check ((select public.is_staff()));
create policy "staff edit offers" on public.offers for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff remove offers" on public.offers for delete to authenticated using ((select public.is_staff()));

create policy "anyone sends an inquiry" on public.inquiries for insert to anon, authenticated with check (status = 'new' and staff_note is null);
create policy "staff read inquiries" on public.inquiries for select to authenticated using ((select public.is_staff()));
create policy "staff update inquiries" on public.inquiries for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff delete inquiries" on public.inquiries for delete to authenticated using ((select public.is_staff()));

grant select on public.site_settings, public.brands, public.categories, public.products, public.team_members, public.offers to anon, authenticated;
grant insert on public.inquiries to anon, authenticated;
grant select, insert, update, delete on public.staff, public.site_settings, public.brands, public.categories, public.products, public.team_members, public.offers, public.inquiries to authenticated;
revoke execute on function public.is_staff() from public;
revoke execute on function public.is_admin() from public;
grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.is_admin() to authenticated;

-- Media bucket: anyone can view, only staff can upload or change
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml'])
on conflict (id) do nothing;

create policy "staff upload media" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (select public.is_staff()));
create policy "staff update media" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (select public.is_staff())) with check (bucket_id = 'media' and (select public.is_staff()));
create policy "staff delete media" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (select public.is_staff()));
