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
