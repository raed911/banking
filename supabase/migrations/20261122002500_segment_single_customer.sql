-- VAYRO · 0025 · Campaign segment for one customer (message sent from the customer profile). Same consent/channel rules.
create or replace function private.segment_customers(p_merchant_id uuid, p_segment jsonb, p_require_consent boolean, p_channel text)
returns table (customer_id uuid) language sql stable security definer set search_path = '' as $$
  select c.id from public.customers c
  where c.merchant_id = p_merchant_id and c.deleted_at is null
    and (not p_require_consent or c.marketing_consent)
    and (p_channel <> 'email' or c.email is not null)
    and (p_channel <> 'sms' or c.phone is not null)
    and (p_channel <> 'wallet' or exists (select 1 from public.wallet_passes w join public.loyalty_cards k on k.id = w.card_id where k.customer_id = c.id and w.removed_at is null))
    and case coalesce(p_segment ->> 'type', 'all')
      when 'all' then true
      when 'inactive' then coalesce(c.last_visit_at, c.created_at) < now() - make_interval(days => coalesce((p_segment ->> 'days')::int, 30))
      when 'active' then c.last_visit_at >= now() - make_interval(days => coalesce((p_segment ->> 'days')::int, 30))
      when 'new' then c.created_at >= now() - make_interval(days => coalesce((p_segment ->> 'days')::int, 30))
      when 'birthday_month' then c.birthday is not null and extract(month from c.birthday) = extract(month from now() at time zone 'Africa/Tunis')
      when 'tag' then (p_segment ->> 'tag') = any (c.tags)
      when 'program' then exists (select 1 from public.loyalty_cards k where k.customer_id = c.id and k.program_id = (p_segment ->> 'program_id')::uuid and k.status = 'active')
      when 'customer' then c.id = (p_segment ->> 'customer_id')::uuid
      else false end;
$$;
