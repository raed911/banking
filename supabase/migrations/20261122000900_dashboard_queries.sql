-- VAYRO · 0009 · Aggregated read functions for dashboards (permission-checked, single round-trip)
create or replace function public.merchant_overview(p_merchant_id uuid, p_days int default 30)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  tz text;
  since timestamptz;
  prev_since timestamptz;
  result jsonb;
begin
  if not (public.has_merchant_permission(p_merchant_id, 'dashboard.view') or public.is_platform_admin()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  p_days := least(greatest(p_days, 7), 365);
  select timezone into tz from public.merchants where id = p_merchant_id;
  since := date_trunc('day', now() at time zone tz) at time zone tz - make_interval(days => p_days - 1);
  prev_since := since - make_interval(days => p_days);

  with tx as (
    select kind, amount, created_at, customer_id from public.loyalty_transactions
    where merchant_id = p_merchant_id and created_at >= prev_since
  ),
  cur as (select * from tx where created_at >= since),
  prv as (select * from tx where created_at < since),
  days as (
    select generate_series(0, p_days - 1) as i
  ),
  series as (
    select to_char((since at time zone tz)::date + d.i, 'YYYY-MM-DD') as day,
      coalesce(sum(c.amount) filter (where c.kind = 'earn'), 0) as earned,
      coalesce(-sum(c.amount) filter (where c.kind = 'redeem'), 0) as redeemed,
      count(distinct c.customer_id) filter (where c.kind = 'earn') as visitors
    from days d
    left join cur c on (c.created_at at time zone tz)::date = (since at time zone tz)::date + d.i
    group by d.i order by d.i
  )
  select jsonb_build_object(
    'days', p_days,
    'customers_total', (select count(*) from public.customers where merchant_id = p_merchant_id and deleted_at is null),
    'customers_new', (select count(*) from public.customers where merchant_id = p_merchant_id and deleted_at is null and created_at >= since),
    'customers_new_prev', (select count(*) from public.customers where merchant_id = p_merchant_id and deleted_at is null and created_at >= prev_since and created_at < since),
    'cards_active', (select count(*) from public.loyalty_cards where merchant_id = p_merchant_id and status = 'active'),
    'wallet_passes', (select count(*) from public.wallet_passes where merchant_id = p_merchant_id and removed_at is null),
    'visits', (select count(*) from cur where kind = 'earn'),
    'visits_prev', (select count(*) from prv where kind = 'earn'),
    'earned', (select coalesce(sum(amount), 0) from cur where kind = 'earn'),
    'earned_prev', (select coalesce(sum(amount), 0) from prv where kind = 'earn'),
    'rewards_redeemed', (select count(*) from cur where kind = 'redeem'),
    'rewards_redeemed_prev', (select count(*) from prv where kind = 'redeem'),
    'returning_customers', (select count(*) from (select customer_id from cur where kind = 'earn' group by customer_id having count(*) > 1) r),
    'active_customers', (select count(distinct customer_id) from cur where kind = 'earn'),
    'series', (select coalesce(jsonb_agg(jsonb_build_object('day', day, 'earned', earned, 'redeemed', redeemed, 'visitors', visitors)), '[]'::jsonb) from series),
    'programs', (select count(*) from public.loyalty_programs where merchant_id = p_merchant_id and status <> 'archived'),
    'programs_active', (select count(*) from public.loyalty_programs where merchant_id = p_merchant_id and status = 'active'),
    'has_design', exists (select 1 from public.card_designs where merchant_id = p_merchant_id),
    'has_link', exists (select 1 from public.enrollment_links where merchant_id = p_merchant_id and is_active),
    'members', (select count(*) from public.merchant_members where merchant_id = p_merchant_id and status = 'active'),
    'fraud_open', (select count(*) from public.fraud_signals where merchant_id = p_merchant_id and reviewed_at is null and severity in ('medium', 'high') and created_at >= since)
  ) into result;
  return result;
end $$;
revoke all on function public.merchant_overview(uuid, int) from public, anon;
grant execute on function public.merchant_overview(uuid, int) to authenticated;
