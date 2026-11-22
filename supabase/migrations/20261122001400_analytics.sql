-- VAYRO · 0014 · Merchant analytics breakdowns
create or replace function public.merchant_analytics(p_merchant_id uuid, p_days int default 30)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare tz text; since timestamptz;
begin
  if not (public.has_merchant_permission(p_merchant_id, 'analytics.view') or public.is_platform_admin()) then raise exception 'forbidden' using errcode = '42501'; end if;
  p_days := least(greatest(p_days, 7), 365);
  select timezone into tz from public.merchants where id = p_merchant_id;
  since := date_trunc('day', now() at time zone tz) at time zone tz - make_interval(days => p_days - 1);
  return jsonb_build_object(
    'programs', (select coalesce(jsonb_agg(x order by x->>'earned' desc), '[]') from (
      select jsonb_build_object('name', p.name, 'type', p.type,
        'cards', (select count(*) from public.loyalty_cards c where c.program_id = p.id),
        'earned', coalesce(sum(t.amount) filter (where t.kind = 'earn'), 0),
        'redeemed', count(*) filter (where t.kind = 'redeem'),
        'visitors', count(distinct t.customer_id) filter (where t.kind = 'earn')) x
      from public.loyalty_programs p left join public.loyalty_transactions t on t.program_id = p.id and t.created_at >= since
      where p.merchant_id = p_merchant_id and p.status <> 'archived' group by p.id) s),
    'top_customers', (select coalesce(jsonb_agg(x), '[]') from (
      select jsonb_build_object('id', c.id, 'name', c.first_name || coalesce(' ' || c.last_name, ''), 'visits', count(*)) x
      from public.loyalty_transactions t join public.customers c on c.id = t.customer_id
      where t.merchant_id = p_merchant_id and t.kind = 'earn' and t.created_at >= since group by c.id order by count(*) desc limit 8) s),
    'locations', (select coalesce(jsonb_agg(x), '[]') from (
      select jsonb_build_object('name', coalesce(l.name, '—'), 'visits', count(*)) x
      from public.loyalty_transactions t left join public.locations l on l.id = t.location_id
      where t.merchant_id = p_merchant_id and t.kind = 'earn' and t.created_at >= since group by l.name order by count(*) desc limit 10) s),
    'employees', (select coalesce(jsonb_agg(x), '[]') from (
      select jsonb_build_object('name', coalesce(pr.full_name, u.email::text, '—'), 'operations', count(*)) x
      from public.loyalty_transactions t left join auth.users u on u.id = t.performed_by left join public.profiles pr on pr.id = t.performed_by
      where t.merchant_id = p_merchant_id and t.created_at >= since and t.performed_by is not null group by pr.full_name, u.email order by count(*) desc limit 10) s),
    'hours', (select coalesce(jsonb_agg(jsonb_build_object('hour', h, 'visits', coalesce(v, 0)) order by h), '[]') from (
      select h, (select count(*) from public.loyalty_transactions t where t.merchant_id = p_merchant_id and t.kind = 'earn' and t.created_at >= since and extract(hour from t.created_at at time zone tz) = h) v
      from generate_series(6, 23) h) s),
    'sources', (select coalesce(jsonb_object_agg(source, n), '{}') from (select source, count(*) n from public.customers where merchant_id = p_merchant_id and created_at >= since and deleted_at is null group by source) s),
    'consent_rate', (select case when count(*) = 0 then 0 else round(100.0 * count(*) filter (where marketing_consent) / count(*)) end from public.customers where merchant_id = p_merchant_id and deleted_at is null)
  );
end $$;
revoke all on function public.merchant_analytics(uuid, int) from public, anon;
grant execute on function public.merchant_analytics(uuid, int) to authenticated;
