-- Little Treasures V1.1 inquiry workflow
-- Additive only: does not modify products or existing CMS records.

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text,
  role text,
  country text not null,
  phone text,
  estimated_quantity text,
  message text,
  status text not null default 'new'
    check (status in ('new','contacted','quoted','negotiating','won','lost','archived')),
  source text not null default 'website',
  locale text not null default 'en' check (locale in ('en','zh')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inquiry_items (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  product_id text,
  product_slug text,
  product_name text not null,
  quantity integer not null default 1 check (quantity > 0),
  notes text,
  image_url text,
  created_at timestamptz not null default now()
);

create index if not exists inquiries_created_at_idx on public.inquiries(created_at desc);
create index if not exists inquiries_status_idx on public.inquiries(status);
create index if not exists inquiry_items_inquiry_id_idx on public.inquiry_items(inquiry_id);

drop trigger if exists set_inquiries_updated_at on public.inquiries;
create trigger set_inquiries_updated_at before update on public.inquiries
for each row execute function public.set_updated_at();

alter table public.inquiries enable row level security;
alter table public.inquiry_items enable row level security;

drop policy if exists "Admins can read inquiries" on public.inquiries;
create policy "Admins can read inquiries" on public.inquiries for select to authenticated using (public.is_admin());
drop policy if exists "Admins can update inquiries" on public.inquiries;
create policy "Admins can update inquiries" on public.inquiries for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can read inquiry items" on public.inquiry_items;
create policy "Admins can read inquiry items" on public.inquiry_items for select to authenticated using (public.is_admin());

