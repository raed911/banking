-- VAYRO · 0021 · Latest announcement for a card holder (server reads it with the card token)
create or replace function public.card_announcement(p_card_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', c.id, 'body', c.content ->> 'body', 'coupon', cp.code, 'coupon_name', cp.name, 'sent_at', c.sent_at)
  from public.loyalty_cards k
  join public.campaign_deliveries d on d.customer_id = k.customer_id and d.status in ('sent', 'skipped')
  join public.campaigns c on c.id = d.campaign_id and c.status in ('sending', 'sent') and c.channel in ('card', 'wallet')
    and coalesce(c.sent_at, c.scheduled_at, c.created_at) > now() - interval '14 days'
  left join public.coupons cp on cp.id = c.coupon_id and cp.status = 'active'
  where k.id = p_card_id
  order by coalesce(c.sent_at, c.scheduled_at) desc
  limit 1;
$$;
revoke all on function public.card_announcement(uuid) from public, anon, authenticated;
grant execute on function public.card_announcement(uuid) to service_role;
