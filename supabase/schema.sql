-- Little Treasures From China Supabase schema
-- Run this in the Supabase SQL editor.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'inventory_status') then
    create type public.inventory_status as enum (
      'in_stock',
      'limited',
      'made_to_order',
      'sold_out'
    );
  end if;
end;
$$;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null default '',
  english_name text not null,
  museum text,
  region text,
  province text,
  city text,
  category text,
  collection text,
  price numeric(10, 2),
  currency text not null default 'USD',
  short_description text,
  story text,
  materials text,
  dimensions text,
  weight text,
  images text[] not null default '{}',
  tags text[] not null default '{}',
  occasion_tags text[] not null default '{}',
  recipient_tags text[] not null default '{}',
  gift_recommendations text[] not null default '{}',
  official_collection text,
  inventory_status public.inventory_status not null default 'made_to_order',
  featured boolean not null default false,
  related_product_ids uuid[] not null default '{}',
  shipping_note text,
  return_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products add column if not exists occasion_tags text[] not null default '{}';
alter table public.products add column if not exists recipient_tags text[] not null default '{}';
alter table public.products add column if not exists gift_recommendations text[] not null default '{}';
alter table public.products add column if not exists official_collection text;
alter table public.products add column if not exists museum_id uuid;
alter table public.products add column if not exists category_id uuid;
alter table public.products add column if not exists collection_id uuid;
alter table public.products add column if not exists status text not null default 'published';
alter table public.products add column if not exists seo_title text;
alter table public.products add column if not exists seo_description text;
alter table public.products add column if not exists alt_text text;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  name_zh text not null default '',
  kind text not null default 'product' check (kind in ('product', 'occasion', 'recipient')),
  description text,
  image text,
  featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.museums (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  name_zh text not null default '',
  province text,
  city text,
  logo text,
  cover_image text,
  description text,
  story text,
  featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  name_zh text not null default '',
  museum_id uuid references public.museums(id) on delete set null,
  banner_image text,
  description text,
  story text,
  featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  title_zh text not null default '',
  kind text not null default 'editorial' check (kind in ('editorial', 'about', 'gift_guide')),
  excerpt text,
  excerpt_zh text,
  body text,
  body_zh text,
  cover_image text,
  featured boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  filename text not null,
  alt_text text,
  mime_type text,
  width integer,
  height integer,
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.products
  drop constraint if exists products_museum_id_fkey,
  add constraint products_museum_id_fkey foreign key (museum_id) references public.museums(id) on delete set null;
alter table public.products
  drop constraint if exists products_category_id_fkey,
  add constraint products_category_id_fkey foreign key (category_id) references public.categories(id) on delete set null;
alter table public.products
  drop constraint if exists products_collection_id_fkey,
  add constraint products_collection_id_fkey foreign key (collection_id) references public.collections(id) on delete set null;

create index if not exists products_slug_idx on public.products(slug);
create index if not exists products_featured_idx on public.products(featured);
create index if not exists products_category_idx on public.products(category);
create index if not exists products_museum_idx on public.products(museum);
create index if not exists products_region_idx on public.products(region);
create index if not exists products_occasion_tags_idx on public.products using gin(occasion_tags);
create index if not exists products_recipient_tags_idx on public.products using gin(recipient_tags);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at before update on public.categories for each row execute function public.set_updated_at();
drop trigger if exists set_museums_updated_at on public.museums;
create trigger set_museums_updated_at before update on public.museums for each row execute function public.set_updated_at();
drop trigger if exists set_collections_updated_at on public.collections;
create trigger set_collections_updated_at before update on public.collections for each row execute function public.set_updated_at();
drop trigger if exists set_stories_updated_at on public.stories;
create trigger set_stories_updated_at before update on public.stories for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

alter table public.admin_users enable row level security;
alter table public.products enable row level security;
alter table public.categories enable row level security;
alter table public.museums enable row level security;
alter table public.collections enable row level security;
alter table public.stories enable row level security;
alter table public.media enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists "Admins can read admin users" on public.admin_users;
create policy "Admins can read admin users"
on public.admin_users
for select
to authenticated
using (public.is_admin());

drop policy if exists "Public can read products" on public.products;
create policy "Public can read products"
on public.products
for select
to anon, authenticated
using (true);

do $$
declare table_name text;
begin
  foreach table_name in array array['categories','museums','collections','stories','media','site_settings']
  loop
    execute format('drop policy if exists "Public can read %1$s" on public.%1$I', table_name);
    execute format('create policy "Public can read %1$s" on public.%1$I for select to anon, authenticated using (true)', table_name);
    execute format('drop policy if exists "Admins can insert %1$s" on public.%1$I', table_name);
    execute format('create policy "Admins can insert %1$s" on public.%1$I for insert to authenticated with check (public.is_admin())', table_name);
    execute format('drop policy if exists "Admins can update %1$s" on public.%1$I', table_name);
    execute format('create policy "Admins can update %1$s" on public.%1$I for update to authenticated using (public.is_admin()) with check (public.is_admin())', table_name);
    execute format('drop policy if exists "Admins can delete %1$s" on public.%1$I', table_name);
    execute format('create policy "Admins can delete %1$s" on public.%1$I for delete to authenticated using (public.is_admin())', table_name);
  end loop;
end;
$$;

insert into public.categories (slug, name, name_zh, kind, featured, sort_order)
values
  ('home-living', 'Home & Living', '家居生活', 'product', true, 10),
  ('stationery', 'Stationery', '文具办公', 'product', true, 20),
  ('kids', 'Kids', '亲子儿童', 'product', true, 30),
  ('wear', 'Wear', '穿戴配饰', 'product', true, 40),
  ('teacher-gifts', 'Teacher Gifts', '教师礼物', 'occasion', true, 10),
  ('housewarming', 'Housewarming', '乔迁礼物', 'occasion', true, 20),
  ('birthday', 'Birthday', '生日礼物', 'occasion', true, 30),
  ('for-kids', 'For Kids', '送给孩子', 'occasion', true, 40),
  ('travel-souvenirs', 'Travel Souvenirs', '旅行纪念', 'occasion', true, 50),
  ('corporate-gifts', 'Corporate Gifts', '企业礼赠', 'occasion', true, 60)
on conflict (slug) do nothing;

insert into public.site_settings (key, value)
values
  ('homepage', '{"heroTitle":"Thoughtful Gifts Inspired by China''s Museums","heroTitleZh":"来自中国博物馆的有心礼物","heroDescription":"Discover museum gifts curated for everyday life, thoughtful gifting, and meaningful cultural stories.","heroDescriptionZh":"发现适合日常生活、用心赠礼与文化分享的博物馆灵感好物。"}'::jsonb),
  ('brand', '{"name":"Little Treasures From China","email":"hello@auctuslab.com"}'::jsonb)
on conflict (key) do nothing;

drop policy if exists "Admins can insert products" on public.products;
create policy "Admins can insert products"
on public.products
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update products" on public.products;
create policy "Admins can update products"
on public.products
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products"
on public.products
for delete
to authenticated
using (public.is_admin());

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can read product images" on storage.objects;
create policy "Public can read product images"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'product-images');

drop policy if exists "Admins can upload product images" on storage.objects;
create policy "Admins can upload product images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "Admins can update product images" on storage.objects;
create policy "Admins can update product images"
on storage.objects
for update
to authenticated
using (bucket_id = 'product-images' and public.is_admin())
with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "Admins can delete product images" on storage.objects;
create policy "Admins can delete product images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'product-images' and public.is_admin());

-- After creating your first Supabase Auth user, register that user as admin:
-- insert into public.admin_users (user_id, email)
-- values ('YOUR_AUTH_USER_UUID', 'you@example.com');
