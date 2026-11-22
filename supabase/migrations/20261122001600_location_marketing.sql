-- VAYRO · 0016 · Location marketing: per-location geofence settings for Wallet pass relevance,
-- and time-boxed location campaigns. No customer location is ever stored: the phone OS evaluates proximity.
alter table public.locations
  add column geo_enabled boolean not null default false,
  add column geo_radius_m int not null default 100 check (geo_radius_m between 20 and 1000),
  add column geo_message text check (char_length(geo_message) <= 120),
  add constraint locations_coords_ck check ((latitude is null and longitude is null) or (latitude between -90 and 90 and longitude between -180 and 180)),
  add constraint locations_geo_requires_coords_ck check (not geo_enabled or (latitude is not null and longitude is not null));
grant update (geo_enabled, geo_radius_m, geo_message) on public.locations to authenticated;
grant insert (geo_enabled, geo_radius_m, geo_message) on public.locations to authenticated;

create type public.location_campaign_status as enum ('draft', 'scheduled', 'active', 'paused', 'ended');

create table public.location_campaigns (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  message text not null check (char_length(message) between 3 and 120),   -- Wallet relevant text (lock-screen line)
  location_ids uuid[] not null check (cardinality(location_ids) between 1 and 10),
  program_ids uuid[],                                                        -- null = all programs
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.location_campaign_status not null default 'draft',
  coupon_id uuid references public.coupons (id) on delete set null,
  passes_updated int not null default 0,
  last_published_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint location_campaign_dates_ck check (ends_at > starts_at)
);
create trigger location_campaigns_touch before update on public.location_campaigns for each row execute function private.touch_updated_at();
create index location_campaigns_merchant_idx on public.location_campaigns (merchant_id, starts_at desc);
create index location_campaigns_window_idx on public.location_campaigns (starts_at, ends_at) where status in ('scheduled', 'active');

alter table public.location_campaigns enable row level security;
alter table public.location_campaigns force row level security;
grant select, delete on public.location_campaigns to authenticated;
grant insert (merchant_id, name, message, location_ids, program_ids, starts_at, ends_at, status, coupon_id, created_by) on public.location_campaigns to authenticated;
grant update (name, message, location_ids, program_ids, starts_at, ends_at, status, coupon_id) on public.location_campaigns to authenticated;
grant all on public.location_campaigns to service_role;
create policy "platform admins read all" on public.location_campaigns for select to authenticated using ((select public.is_platform_admin()));
create policy "campaign managers read" on public.location_campaigns for select to authenticated using ((select public.has_merchant_permission(merchant_id, 'campaigns.manage')));
create policy "campaign managers ins" on public.location_campaigns for insert to authenticated with check (
  (select public.has_merchant_permission(merchant_id, 'campaigns.manage'))
  and not exists (select 1 from unnest(location_ids) lid where not exists (select 1 from public.locations l where l.id = lid and l.merchant_id = location_campaigns.merchant_id)));
create policy "campaign managers upd" on public.location_campaigns for update to authenticated using ((select public.has_merchant_permission(merchant_id, 'campaigns.manage')))
  with check (not exists (select 1 from unnest(location_ids) lid where not exists (select 1 from public.locations l where l.id = lid and l.merchant_id = location_campaigns.merchant_id)));
create policy "campaign managers del" on public.location_campaigns for delete to authenticated using ((select public.has_merchant_permission(merchant_id, 'campaigns.manage')) and status in ('draft', 'ended'));

-- Any change that affects what passes should carry → refresh this merchant's Wallet passes (deduplicated job).
create or replace function private.enqueue_merchant_pass_refresh()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.enqueue_job('wallet.refresh_merchant', jsonb_build_object('merchant_id', coalesce(new.merchant_id, old.merchant_id), 'reason', tg_table_name),
    'merchant:' || coalesce(new.merchant_id, old.merchant_id)::text, interval '30 seconds');
  return coalesce(new, old);
end $$;
create trigger locations_geo_refresh after insert or delete or update of latitude, longitude, geo_enabled, geo_radius_m, geo_message, is_active on public.locations
  for each row execute function private.enqueue_merchant_pass_refresh();
create trigger location_campaigns_refresh after insert or delete or update of message, location_ids, starts_at, ends_at, status on public.location_campaigns
  for each row execute function private.enqueue_merchant_pass_refresh();

-- Status machine driven by time (cron every 5 minutes): scheduled→active at start, active→ended at end; each transition refreshes passes.
create or replace function private.run_location_campaign_scheduler()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare started int; ended int;
begin
  update public.location_campaigns set status = 'active' where status = 'scheduled' and starts_at <= now() and ends_at > now();
  get diagnostics started = row_count;
  update public.location_campaigns set status = 'ended' where status in ('active', 'scheduled', 'paused') and ends_at <= now();
  get diagnostics ended = row_count;
  return jsonb_build_object('started', started, 'ended', ended);
end $$;
do $$ begin perform cron.schedule('vayro-location-campaigns', '*/5 * * * *', 'select private.run_location_campaign_scheduler()');
exception when others then raise notice 'pg_cron unavailable: %', sqlerrm; end $$;

-- Campaign analytics: visits at targeted locations during the window vs. the same-length window before.
create or replace function public.location_campaign_stats(p_campaign_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c public.location_campaigns; win interval; cur_end timestamptz;
begin
  select * into c from public.location_campaigns where id = p_campaign_id;
  if not found then return null; end if;
  if not (public.has_merchant_permission(c.merchant_id, 'campaigns.manage') or public.is_platform_admin()) then raise exception 'forbidden' using errcode = '42501'; end if;
  cur_end := least(c.ends_at, now());
  win := greatest(cur_end - c.starts_at, interval '0');
  return jsonb_build_object(
    'visits', (select count(*) from public.loyalty_transactions t where t.merchant_id = c.merchant_id and t.kind = 'earn' and t.location_id = any (c.location_ids) and t.created_at between c.starts_at and cur_end),
    'visits_before', (select count(*) from public.loyalty_transactions t where t.merchant_id = c.merchant_id and t.kind = 'earn' and t.location_id = any (c.location_ids) and t.created_at between c.starts_at - win and c.starts_at),
    'customers', (select count(distinct t.customer_id) from public.loyalty_transactions t where t.merchant_id = c.merchant_id and t.kind = 'earn' and t.location_id = any (c.location_ids) and t.created_at between c.starts_at and cur_end),
    'coupon_redemptions', (select count(*) from public.coupon_redemptions r where r.coupon_id = c.coupon_id and r.created_at between c.starts_at and cur_end),
    'passes_reached', (select count(*) from public.wallet_passes w join public.loyalty_cards k on k.id = w.card_id where w.merchant_id = c.merchant_id and w.removed_at is null and w.installed_at is not null and (c.program_ids is null or k.program_id = any (c.program_ids))),
    'elapsed_hours', round(extract(epoch from win) / 3600)
  );
end $$;
revoke all on function public.location_campaign_stats(uuid) from public, anon;
grant execute on function public.location_campaign_stats(uuid) to authenticated;

-- Admin overview of location marketing usage across the platform
create or replace function public.admin_location_marketing()
returns table (merchant_id uuid, merchant text, geo_locations bigint, campaigns_total bigint, campaigns_active bigint, last_campaign_at timestamptz, wallet_passes bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
  select m.id, m.name,
    (select count(*) from public.locations l where l.merchant_id = m.id and l.geo_enabled and l.is_active),
    (select count(*) from public.location_campaigns c where c.merchant_id = m.id),
    (select count(*) from public.location_campaigns c where c.merchant_id = m.id and c.status = 'active'),
    (select max(c.created_at) from public.location_campaigns c where c.merchant_id = m.id),
    (select count(*) from public.wallet_passes w where w.merchant_id = m.id and w.removed_at is null)
  from public.merchants m
  where exists (select 1 from public.locations l where l.merchant_id = m.id and l.geo_enabled) or exists (select 1 from public.location_campaigns c where c.merchant_id = m.id)
  order by 5 desc, 4 desc;
end $$;
revoke all on function public.admin_location_marketing() from public, anon;
grant execute on function public.admin_location_marketing() to authenticated;
