-- VAYRO · 0022 · Automations: daily win-back & birthday messages through the campaign pipeline
create table public.automations (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  kind text not null check (kind in ('winback', 'birthday')),
  enabled boolean not null default false,
  channel public.campaign_channel not null default 'card',
  inactive_days int not null default 30 check (inactive_days between 7 and 365),
  cooldown_days int not null default 30 check (cooldown_days between 7 and 365),
  message text not null check (char_length(message) between 3 and 300),
  coupon_id uuid references public.coupons (id) on delete set null,
  last_run_at timestamptz,
  total_sent int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, kind)
);
create trigger automations_touch before update on public.automations for each row execute function private.touch_updated_at();
alter table public.automations enable row level security;
alter table public.automations force row level security;
grant select on public.automations to authenticated;
grant insert (merchant_id, kind, enabled, channel, inactive_days, cooldown_days, message, coupon_id) on public.automations to authenticated;
grant update (enabled, channel, inactive_days, cooldown_days, message, coupon_id) on public.automations to authenticated;
grant all on public.automations to service_role;
create policy "platform admins read all" on public.automations for select to authenticated using ((select public.is_platform_admin()));
create policy "campaign managers read" on public.automations for select to authenticated using ((select public.has_merchant_permission(merchant_id, 'campaigns.manage')));
create policy "campaign managers ins" on public.automations for insert to authenticated with check ((select public.has_merchant_permission(merchant_id, 'campaigns.manage')));
create policy "campaign managers upd" on public.automations for update to authenticated using ((select public.has_merchant_permission(merchant_id, 'campaigns.manage')));

alter table public.campaigns add column automation_id uuid references public.automations (id) on delete set null;
create index campaign_deliveries_customer_idx on public.campaign_deliveries (customer_id, created_at desc);

-- Runs every enabled automation once per day: builds an automatic campaign with eligible customers
-- (consent, channel reachability, inactivity/birthday rule, per-customer cooldown) and queues sending.
create or replace function private.run_automations()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare a public.automations; cid uuid; n int; total int := 0; ran int := 0; tz text;
begin
  for a in select * from public.automations where enabled and (last_run_at is null or last_run_at < now() - interval '20 hours') loop
    if not private.merchant_is_entitled(a.merchant_id) then continue; end if;
    select timezone into tz from public.merchants where id = a.merchant_id;
    insert into public.campaigns (merchant_id, name, channel, status, segment, content, coupon_id, scheduled_at, automation_id)
    values (a.merchant_id, case a.kind when 'winback' then 'Relance automatique' else 'Anniversaire' end || ' · ' || to_char(now() at time zone tz, 'DD/MM'),
      a.channel, 'scheduled', jsonb_build_object('type', a.kind, 'days', a.inactive_days), jsonb_build_object('body', a.message), a.coupon_id, now(), a.id)
    returning id into cid;
    insert into public.campaign_deliveries (merchant_id, campaign_id, customer_id)
    select a.merchant_id, cid, s.customer_id
    from private.segment_customers(a.merchant_id,
      case a.kind when 'winback' then jsonb_build_object('type', 'inactive', 'days', a.inactive_days) else jsonb_build_object('type', 'birthday_month') end,
      true, a.channel::text) s
    join public.customers c on c.id = s.customer_id
    where (a.kind <> 'birthday' or (extract(day from c.birthday) = extract(day from now() at time zone tz)))
      and not exists (
        select 1 from public.campaign_deliveries d join public.campaigns x on x.id = d.campaign_id
        where d.customer_id = s.customer_id and x.automation_id = a.id and x.id <> cid
          and d.created_at > now() - make_interval(days => a.cooldown_days));
    get diagnostics n = row_count;
    if n = 0 then
      delete from public.campaigns where id = cid;
    else
      update public.campaigns set stats = jsonb_build_object('targeted', n, 'sent', 0, 'failed', 0) where id = cid;
      perform private.enqueue_job('campaign.send', jsonb_build_object('campaign_id', cid), 'campaign:' || cid::text);
      total := total + n;
    end if;
    update public.automations set last_run_at = now(), total_sent = total_sent + n where id = a.id;
    ran := ran + 1;
  end loop;
  return jsonb_build_object('automations', ran, 'recipients', total);
end $$;

do $$ begin perform cron.schedule('vayro-automations', '0 9 * * *', 'select private.run_automations()');
exception when others then raise notice 'pg_cron unavailable: %', sqlerrm; end $$;
