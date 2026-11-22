-- VAYRO · 0018 · Campaign audiences: server-side segment evaluation (never trusts client-side filters)
-- segment JSON: {"type":"all"|"inactive"|"active"|"birthday_month"|"new"|"tag"|"program", "days":int, "tag":text, "program_id":uuid}
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
      else false end;
$$;

create or replace function public.campaign_audience_count(p_merchant_id uuid, p_segment jsonb, p_channel public.campaign_channel)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_merchant_permission(p_merchant_id, 'campaigns.manage') then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'eligible', (select count(*) from private.segment_customers(p_merchant_id, p_segment, true, p_channel::text)),
    'segment_total', (select count(*) from private.segment_customers(p_merchant_id, p_segment, false, 'any')),
    'without_consent', (select count(*) from private.segment_customers(p_merchant_id, p_segment, false, 'any')) - (select count(*) from private.segment_customers(p_merchant_id, p_segment, true, 'any')));
end $$;
revoke all on function public.campaign_audience_count(uuid, jsonb, public.campaign_channel) from public, anon;
grant execute on function public.campaign_audience_count(uuid, jsonb, public.campaign_channel) to authenticated;

-- Scheduling: materializes recipients and queues the send job (the channel worker delivers when configured).
create or replace function public.schedule_campaign(p_campaign_id uuid, p_send_at timestamptz default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.campaigns; n int;
begin
  select * into c from public.campaigns where id = p_campaign_id for update;
  if not found then raise exception 'not_found'; end if;
  if not public.has_merchant_permission(c.merchant_id, 'campaigns.manage') then raise exception 'forbidden' using errcode = '42501'; end if;
  if c.status not in ('draft', 'scheduled') then raise exception 'not_editable'; end if;
  if not private.merchant_is_entitled(c.merchant_id) then raise exception 'subscription_inactive'; end if;
  delete from public.campaign_deliveries where campaign_id = c.id and status = 'pending';
  insert into public.campaign_deliveries (merchant_id, campaign_id, customer_id)
  select c.merchant_id, c.id, s.customer_id from private.segment_customers(c.merchant_id, c.segment, true, c.channel::text) s
  on conflict (campaign_id, customer_id) do nothing;
  get diagnostics n = row_count;
  update public.campaigns set status = 'scheduled', scheduled_at = coalesce(p_send_at, now()),
    stats = jsonb_build_object('targeted', n, 'sent', 0, 'failed', 0, 'opened', 0) where id = c.id;
  perform private.enqueue_job('campaign.send', jsonb_build_object('campaign_id', c.id), 'campaign:' || c.id::text, greatest(coalesce(p_send_at, now()) - now(), interval '0'));
  perform private.audit(c.merchant_id, 'campaign.scheduled', 'campaign', c.id::text, jsonb_build_object('recipients', n, 'channel', c.channel));
  return jsonb_build_object('ok', true, 'recipients', n);
end $$;
revoke all on function public.schedule_campaign(uuid, timestamptz) from public, anon;
grant execute on function public.schedule_campaign(uuid, timestamptz) to authenticated;
