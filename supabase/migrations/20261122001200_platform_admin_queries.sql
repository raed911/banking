-- VAYRO · 0012 · Super admin aggregates (platform admins only)
create or replace function public.platform_overview(p_days int default 30)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare since timestamptz;
begin
  if not public.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  p_days := least(greatest(p_days, 7), 365);
  since := date_trunc('day', now()) - make_interval(days => p_days - 1);
  return jsonb_build_object(
    'merchants_total', (select count(*) from public.merchants where status <> 'closed'),
    'merchants_active', (select count(*) from public.subscriptions s join public.merchants m on m.id = s.merchant_id
                          where m.status = 'active' and s.status = 'active' and s.current_period_end > now()),
    'merchants_trialing', (select count(*) from public.subscriptions where status = 'trialing' and trial_ends_at > now()),
    'merchants_expired', (select count(*) from public.subscriptions where status in ('expired', 'past_due', 'canceled')),
    'merchants_suspended', (select count(*) from public.merchants where status = 'suspended'),
    'merchants_new', (select count(*) from public.merchants where created_at >= since),
    'customers_total', (select count(*) from public.customers where deleted_at is null),
    'cards_total', (select count(*) from public.loyalty_cards where status = 'active'),
    'wallet_passes', (select count(*) from public.wallet_passes where removed_at is null),
    'transactions_period', (select count(*) from public.loyalty_transactions where created_at >= since),
    'mrr_millimes', (select coalesce(sum(p.amount_millimes * s.quantity / p.interval_months), 0)::bigint
                     from public.subscriptions s join public.plan_prices p on p.id = s.price_id
                     where s.status = 'active' and s.current_period_end > now()),
    'revenue_period_millimes', (select coalesce(sum(amount_millimes), 0)::bigint from public.payments where received_at >= since),
    'revenue_month_millimes', (select coalesce(sum(amount_millimes), 0)::bigint from public.payments where received_at >= date_trunc('month', now())),
    'expiring_soon', (select count(*) from public.subscriptions where (status = 'active' and current_period_end between now() and now() + interval '7 days')
                       or (status = 'trialing' and trial_ends_at between now() and now() + interval '3 days')),
    'open_invoices', (select count(*) from public.invoices where status = 'open'),
    'signups', (select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'merchants', (select count(*) from public.merchants where created_at::date = d::date),
                 'revenue', (select coalesce(sum(amount_millimes), 0) from public.payments where received_at::date = d::date)) order by d), '[]'::jsonb)
                from generate_series(since, date_trunc('day', now()), interval '1 day') d)
  );
end $$;
revoke all on function public.platform_overview(int) from public, anon;
grant execute on function public.platform_overview(int) to authenticated;

-- Merchant directory with subscription + usage in one call
create or replace function public.admin_merchants(p_search text default null, p_status text default null, p_limit int default 50, p_offset int default 0)
returns table (id uuid, name text, slug text, city text, phone text, status public.merchant_status, created_at timestamptz, owner_email text,
  sub_status public.subscription_status, trial_ends_at timestamptz, current_period_end timestamptz, quantity int, period public.billing_period,
  customers bigint, cards bigint, last_activity timestamptz, total_count bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
  select m.id, m.name, m.slug, m.city, m.phone, m.status, m.created_at, u.email::text,
    s.status, s.trial_ends_at, s.current_period_end, s.quantity, pp.period,
    (select count(*) from public.customers c where c.merchant_id = m.id and c.deleted_at is null),
    (select count(*) from public.loyalty_cards k where k.merchant_id = m.id),
    (select max(t.created_at) from public.loyalty_transactions t where t.merchant_id = m.id),
    count(*) over ()
  from public.merchants m
  left join public.subscriptions s on s.merchant_id = m.id
  left join public.plan_prices pp on pp.id = s.price_id
  left join auth.users u on u.id = m.created_by
  where (p_search is null or m.name ilike '%' || p_search || '%' or m.slug ilike '%' || p_search || '%' or u.email ilike '%' || p_search || '%' or m.phone ilike '%' || p_search || '%')
    and (p_status is null
      or (p_status = 'suspended' and m.status = 'suspended')
      or (p_status = 'trialing' and s.status = 'trialing')
      or (p_status = 'active' and s.status = 'active')
      or (p_status = 'expired' and s.status in ('expired', 'past_due', 'canceled')))
  order by m.created_at desc
  limit least(p_limit, 200) offset greatest(p_offset, 0);
end $$;
revoke all on function public.admin_merchants(text, text, int, int) from public, anon;
grant execute on function public.admin_merchants(text, text, int, int) to authenticated;
