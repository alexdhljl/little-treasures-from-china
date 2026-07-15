-- Auctus Heritage Product Standard v1.0
-- Safe, additive migration. Existing products, slugs and images are preserved.

alter table public.products add column if not exists sku text;
alter table public.products add column if not exists product_name_en text;
alter table public.products add column if not exists product_name_zh text;
alter table public.products add column if not exists brand text;
alter table public.products add column if not exists supplier text;
alter table public.products add column if not exists series text;
alter table public.products add column if not exists subcategory text;
alter table public.products add column if not exists target_audience text[] not null default '{}';
alter table public.products add column if not exists short_description_en text;
alter table public.products add column if not exists short_description_zh text;
alter table public.products add column if not exists long_description_en text;
alter table public.products add column if not exists long_description_zh text;
alter table public.products add column if not exists story_en text;
alter table public.products add column if not exists story_zh text;
alter table public.products add column if not exists features text[] not null default '{}';
alter table public.products add column if not exists whats_included text[] not null default '{}';
alter table public.products add column if not exists colors text[] not null default '{}';
alter table public.products add column if not exists package_size text;
alter table public.products add column if not exists package_weight text;
alter table public.products add column if not exists estimated_retail_price_min numeric(10,2);
alter table public.products add column if not exists estimated_retail_price_max numeric(10,2);
alter table public.products add column if not exists wholesale_price numeric(10,2);
alter table public.products add column if not exists moq integer not null default 1;
alter table public.products add column if not exists lead_time text;
alter table public.products add column if not exists inventory_quantity integer;
alter table public.products add column if not exists origin text not null default 'China';
alter table public.products add column if not exists cover_image text;
alter table public.products add column if not exists gallery_images text[] not null default '{}';
alter table public.products add column if not exists packaging_images text[] not null default '{}';
alter table public.products add column if not exists lifestyle_images text[] not null default '{}';
alter table public.products add column if not exists image_alt_en text;
alter table public.products add column if not exists image_alt_zh text;
alter table public.products add column if not exists seo_title_en text;
alter table public.products add column if not exists seo_title_zh text;
alter table public.products add column if not exists seo_description_en text;
alter table public.products add column if not exists seo_description_zh text;
alter table public.products add column if not exists seo_keywords text[] not null default '{}';
alter table public.products add column if not exists needs_review boolean not null default false;
alter table public.products add column if not exists ai_generated boolean not null default false;
alter table public.products add column if not exists translation_checked boolean not null default false;
alter table public.products add column if not exists photo_checked boolean not null default false;
alter table public.products add column if not exists source_folder text;
alter table public.products add column if not exists original_file_names text[] not null default '{}';
alter table public.products add column if not exists countries_available text[] not null default array['US']::text[];
alter table public.products add column if not exists languages text[] not null default array['en','zh']::text[];
alter table public.products add column if not exists ltps_version text not null default '1.0';

create unique index if not exists products_sku_unique_idx
on public.products (sku) where sku is not null and sku <> '';
create index if not exists products_status_idx on public.products(status);
create index if not exists products_series_idx on public.products(series);
create index if not exists products_subcategory_idx on public.products(subcategory);
create index if not exists products_target_audience_idx on public.products using gin(target_audience);
create index if not exists products_countries_available_idx on public.products using gin(countries_available);

update public.products set
  product_name_en = coalesce(nullif(product_name_en, ''), nullif(english_name, ''), name),
  product_name_zh = coalesce(nullif(product_name_zh, ''), nullif(name, ''), english_name),
  short_description_en = coalesce(short_description_en, short_description),
  story_en = coalesce(story_en, story),
  estimated_retail_price_min = coalesce(estimated_retail_price_min, price),
  estimated_retail_price_max = coalesce(estimated_retail_price_max, price),
  cover_image = coalesce(cover_image, images[1]),
  gallery_images = case when cardinality(gallery_images) = 0 then coalesce(images, '{}') else gallery_images end,
  image_alt_en = coalesce(image_alt_en, alt_text),
  seo_title_en = coalesce(seo_title_en, seo_title),
  seo_description_en = coalesce(seo_description_en, seo_description),
  status = case when status = 'published' then 'active' else status end,
  ltps_version = '1.0'
where ltps_version is distinct from '1.0'
   or product_name_en is null
   or product_name_zh is null
   or cover_image is null;

alter table public.museums add column if not exists country text not null default 'China';
alter table public.museums add column if not exists website text;
alter table public.museums add column if not exists description_zh text;
alter table public.museums add column if not exists story_zh text;
alter table public.museums add column if not exists ltps_version text not null default '1.0';

alter table public.collections add column if not exists description_zh text;
alter table public.collections add column if not exists story_zh text;
alter table public.collections add column if not exists series text[] not null default '{}';
alter table public.collections add column if not exists ltps_version text not null default '1.0';

insert into public.site_settings (key, value)
values ('ltps', '{"name":"Auctus Heritage Product Standard","version":"1.0","languages":["en","zh"],"defaultLanguage":"en","defaultOrigin":"China","defaultCurrency":"USD"}'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();

comment on table public.products is 'Auctus Heritage Product Standard v1.0 product master';
comment on column public.products.product_name_en is 'Canonical English display name';
comment on column public.products.product_name_zh is 'Canonical Chinese display name';
comment on column public.products.status is 'draft, review, active, hidden, archived; published retained for backward compatibility';
