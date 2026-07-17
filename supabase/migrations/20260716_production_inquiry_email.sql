-- Production inquiry and transactional email workflow.
-- Additive migration: preserves all existing inquiry and product data.

alter table public.inquiries add column if not exists position text;
alter table public.inquiries add column if not exists preferred_language text;
alter table public.inquiries add column if not exists source_page text;
alter table public.inquiries add column if not exists referrer text;
alter table public.inquiries add column if not exists submission_source text not null default 'website';
alter table public.inquiries add column if not exists idempotency_key text;
alter table public.inquiries add column if not exists submission_fingerprint text;
alter table public.inquiries add column if not exists request_identifier text;
alter table public.inquiries add column if not exists user_agent text;
alter table public.inquiries add column if not exists notification_status text not null default 'pending';
alter table public.inquiries add column if not exists notification_sent_at timestamptz;
alter table public.inquiries add column if not exists notification_error text;
alter table public.inquiries add column if not exists confirmation_status text not null default 'pending';
alter table public.inquiries add column if not exists confirmation_sent_at timestamptz;
alter table public.inquiries add column if not exists confirmation_error text;
alter table public.inquiries add column if not exists last_contacted_at timestamptz;
alter table public.inquiries add column if not exists internal_notes text;
alter table public.inquiries add column if not exists archived_at timestamptz;

update public.inquiries set position = role where position is null and role is not null;
update public.inquiries set submission_source = source where submission_source = 'website' and source is not null;
update public.inquiries set notification_status = 'pending' where notification_status is null;
update public.inquiries set confirmation_status = 'pending' where confirmation_status is null;

alter table public.inquiries drop constraint if exists inquiries_status_check;
alter table public.inquiries add constraint inquiries_status_check
  check (status in ('new','reviewing','replied','quote_sent','won','lost','archived','contacted','quoted','negotiating'));

alter table public.inquiries drop constraint if exists inquiries_notification_status_check;
alter table public.inquiries add constraint inquiries_notification_status_check
  check (notification_status in ('pending','sent','failed','not_required'));

alter table public.inquiries drop constraint if exists inquiries_confirmation_status_check;
alter table public.inquiries add constraint inquiries_confirmation_status_check
  check (confirmation_status in ('pending','sent','failed','not_required'));

alter table public.inquiry_items add column if not exists product_url text;

create unique index if not exists inquiries_idempotency_key_unique_idx
  on public.inquiries(idempotency_key) where idempotency_key is not null;
create index if not exists inquiries_submission_fingerprint_idx
  on public.inquiries(submission_fingerprint, created_at desc);
create index if not exists inquiries_notification_status_idx
  on public.inquiries(notification_status);
create index if not exists inquiries_confirmation_status_idx
  on public.inquiries(confirmation_status);

drop trigger if exists set_inquiries_updated_at on public.inquiries;
create trigger set_inquiries_updated_at before update on public.inquiries
for each row execute function public.set_updated_at();

drop policy if exists "Admins can delete inquiries" on public.inquiries;
create policy "Admins can delete inquiries" on public.inquiries
for delete to authenticated using (public.is_admin());

drop policy if exists "Admins can update inquiry items" on public.inquiry_items;
create policy "Admins can update inquiry items" on public.inquiry_items
for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can delete inquiry items" on public.inquiry_items;
create policy "Admins can delete inquiry items" on public.inquiry_items
for delete to authenticated using (public.is_admin());

comment on column public.inquiries.idempotency_key is 'Client-generated key used to safely retry one submission.';
comment on column public.inquiries.submission_fingerprint is 'Privacy-safe hash used to suppress near-identical submissions.';
comment on column public.inquiries.request_identifier is 'Privacy-safe request correlation hash; no raw IP is stored.';

create or replace function public.create_inquiry_with_items(p_inquiry jsonb, p_items jsonb default '[]'::jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  inquiry_id uuid;
begin
  insert into public.inquiries (
    name, email, company, role, position, country, phone, estimated_quantity, message,
    status, source, submission_source, locale, preferred_language, source_page, referrer,
    idempotency_key, submission_fingerprint, request_identifier, user_agent,
    notification_status, confirmation_status
  ) values (
    p_inquiry->>'name', p_inquiry->>'email', nullif(p_inquiry->>'company', ''),
    nullif(p_inquiry->>'position', ''), nullif(p_inquiry->>'position', ''),
    p_inquiry->>'country', nullif(p_inquiry->>'phone', ''),
    nullif(p_inquiry->>'estimated_quantity', ''), nullif(p_inquiry->>'message', ''),
    'new', p_inquiry->>'source', p_inquiry->>'source', p_inquiry->>'locale',
    p_inquiry->>'preferred_language', nullif(p_inquiry->>'source_page', ''),
    nullif(p_inquiry->>'referrer', ''), p_inquiry->>'idempotency_key',
    p_inquiry->>'submission_fingerprint', p_inquiry->>'request_identifier',
    nullif(p_inquiry->>'user_agent', ''), 'pending', 'pending'
  ) returning id into inquiry_id;

  insert into public.inquiry_items (
    inquiry_id, product_id, product_slug, product_name, quantity, notes, image_url, product_url
  )
  select inquiry_id, item.product_id, item.product_slug, item.product_name,
    item.quantity, item.notes, item.image_url, item.product_url
  from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as item(
    product_id text, product_slug text, product_name text, quantity integer,
    notes text, image_url text, product_url text
  );

  return inquiry_id;
end;
$$;

revoke all on function public.create_inquiry_with_items(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_inquiry_with_items(jsonb, jsonb) to service_role;

-- Rollback notes: the new columns and indexes can be removed after exporting their
-- data. Existing inquiry rows and the original role/source columns are unchanged.
