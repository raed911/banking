-- VAYRO · 0005 · Business functions (all SECURITY DEFINER with explicit authorization checks)

-- ───────────── Shared private helpers ─────────────
create or replace function private.audit(p_merchant uuid, p_action text, p_entity_type text, p_entity_id text, p_details jsonb default '{}'::jsonb, p_actor_type text default 'user')
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_logs (merchant_id, actor_id, actor_type, action, entity_type, entity_id, details)
  values (p_merchant, auth.uid(), p_actor_type, p_action, p_entity_type, p_entity_id, coalesce(p_details, '{}'::jsonb));
$$;

create or replace function private.enqueue_job(p_kind text, p_payload jsonb, p_dedupe text default null, p_delay interval default interval '0')
returns void language sql security definer set search_path = '' as $$
  insert into private.job_queue (kind, payload, dedupe_key, run_at)
  values (p_kind, p_payload, p_dedupe, now() + p_delay)
  on conflict (kind, dedupe_key) where status = 'pending' and dedupe_key is not null do nothing;
$$;

create or replace function private.merchant_is_entitled(p_merchant uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.merchants m join public.subscriptions s on s.merchant_id = m.id
    where m.id = p_merchant and m.status = 'active'
      and (
        (s.status = 'trialing' and s.trial_ends_at > now())
        or (s.status in ('active', 'past_due') and s.current_period_end > now() - interval '3 days')
      )
  );
$$;

create or replace function public.merchant_is_entitled(p_merchant uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (public.is_merchant_member(p_merchant) or public.is_platform_admin()) and private.merchant_is_entitled(p_merchant);
$$;

create or replace function private.flag(p_merchant uuid, p_card uuid, p_customer uuid, p_rule text, p_severity text, p_details jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.fraud_signals (merchant_id, card_id, customer_id, actor_id, rule, severity, details)
  values (p_merchant, p_card, p_customer, auth.uid(), p_rule, p_severity, p_details);
$$;

-- Fixed-window rate limiter. Returns true when the call is allowed.
create or replace function public.check_rate_limit(p_key text, p_max int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  c int;
begin
  insert into private.rate_limits (key, window_start, count) values (p_key, w, 1)
  on conflict (key, window_start) do update set count = private.rate_limits.count + 1
  returning count into c;
  if random() < 0.01 then
    delete from private.rate_limits where window_start < now() - interval '1 day';
  end if;
  return c <= p_max;
end $$;

-- ───────────── Onboarding ─────────────
create or replace function private.default_role_permissions(p_key text)
returns text[] language sql immutable set search_path = '' as $$
  select case p_key
    when 'owner' then array['*']
    when 'admin' then array['dashboard.view','programs.manage','customers.view','customers.manage','customers.export','cards.earn','cards.adjust','rewards.manage','rewards.redeem','coupons.manage','coupons.redeem','campaigns.manage','analytics.view','transactions.view','employees.manage','roles.manage','locations.manage','integrations.manage','settings.manage']
    when 'manager' then array['dashboard.view','customers.view','customers.manage','cards.earn','cards.adjust','rewards.redeem','coupons.redeem','campaigns.manage','analytics.view','transactions.view']
    when 'cashier' then array['customers.view','customers.manage','cards.earn','rewards.redeem','coupons.redeem']
    else array[]::text[]
  end;
$$;

create or replace function public.create_merchant(p_name text, p_slug text, p_industry text default null, p_phone text default null, p_city text default null, p_locale text default 'fr')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  mid uuid;
  owner_role uuid;
  plan record;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if (select count(*) from public.merchant_members where user_id = uid and status = 'active') >= 5 then
    raise exception 'merchant_limit_reached' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.merchants where slug = lower(p_slug)) then
    raise exception 'slug_taken' using errcode = '23505';
  end if;

  insert into public.merchants (name, slug, industry, phone, city, locale, created_by)
  values (trim(p_name), lower(p_slug), p_industry, p_phone, p_city, coalesce(p_locale, 'fr'), uid)
  returning id into mid;

  insert into public.roles (merchant_id, key, name, description, permissions, is_system)
  select mid, r.key, r.name, r.description, private.default_role_permissions(r.key), true
  from (values
    ('owner', 'Propriétaire', 'Accès complet, y compris la facturation.'),
    ('admin', 'Administrateur', 'Gère tout sauf la facturation.'),
    ('manager', 'Manager', 'Gère les clients, la fidélité et les campagnes.'),
    ('cashier', 'Caissier', 'Scanne les cartes et valide les récompenses.')
  ) as r(key, name, description);

  select id into owner_role from public.roles where merchant_id = mid and key = 'owner';
  insert into public.merchant_members (merchant_id, user_id, role_id, status) values (mid, uid, owner_role, 'active');
  insert into public.locations (merchant_id, name, city, phone) values (mid, trim(p_name), p_city, p_phone);

  select * into plan from public.plans where key = 'pro' and is_active order by sort limit 1;
  if plan.id is not null then
    insert into public.subscriptions (merchant_id, plan_id, status, quantity, trial_ends_at)
    values (mid, plan.id, 'trialing', 1, now() + make_interval(days => plan.trial_days));
  end if;

  update public.profiles set last_merchant_id = mid where id = uid;
  perform private.audit(mid, 'merchant.created', 'merchant', mid::text, jsonb_build_object('name', p_name));
  return mid;
end $$;

-- ───────────── Ledger engine ─────────────
create or replace function private.apply_tx(
  p_card_id uuid, p_kind public.ledger_kind, p_amount int, p_idempotency_key text, p_actor uuid,
  p_location_id uuid default null, p_source text default 'dashboard', p_purchase_millimes bigint default null,
  p_note text default null, p_reward_id uuid default null, p_reversed uuid default null, p_enforce_rules boolean default true
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  card public.loyalty_cards;
  prog public.loyalty_programs;
  existing public.loyalty_transactions;
  tz text;
  delta int;
  last_earn timestamptz;
  earned_today int;
  actor_hour int;
  tx_id uuid;
begin
  select * into card from public.loyalty_cards where id = p_card_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'card_not_found'); end if;

  select * into existing from public.loyalty_transactions where merchant_id = card.merchant_id and idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('ok', true, 'duplicate', true, 'transaction_id', existing.id, 'balance', card.balance, 'amount', existing.amount);
  end if;

  if card.status <> 'active' then return jsonb_build_object('ok', false, 'error', 'card_inactive'); end if;
  select * into prog from public.loyalty_programs where id = card.program_id;
  if prog.status <> 'active' and p_kind in ('earn', 'redeem') then return jsonb_build_object('ok', false, 'error', 'program_inactive'); end if;
  if not private.merchant_is_entitled(card.merchant_id) then return jsonb_build_object('ok', false, 'error', 'subscription_inactive'); end if;
  if p_location_id is not null and not exists (select 1 from public.locations where id = p_location_id and merchant_id = card.merchant_id) then
    return jsonb_build_object('ok', false, 'error', 'invalid_location');
  end if;

  select timezone into tz from public.merchants where id = card.merchant_id;

  if p_kind = 'earn' then
    if prog.type = 'points' and p_purchase_millimes is not null then
      delta := floor(p_purchase_millimes * prog.points_per_unit / 1000.0)::int;
    else
      delta := coalesce(p_amount, 1);
    end if;
    if delta <= 0 then return jsonb_build_object('ok', false, 'error', 'invalid_amount'); end if;

    if p_enforce_rules then
      if delta > prog.max_earn_per_transaction then
        perform private.flag(card.merchant_id, card.id, card.customer_id, 'max_per_transaction', 'medium', jsonb_build_object('requested', delta, 'max', prog.max_earn_per_transaction));
        return jsonb_build_object('ok', false, 'error', 'max_per_transaction', 'max', prog.max_earn_per_transaction);
      end if;

      select max(created_at) into last_earn from public.loyalty_transactions where card_id = card.id and kind = 'earn';
      if prog.cooldown_minutes > 0 and last_earn is not null and last_earn > now() - make_interval(mins => prog.cooldown_minutes) then
        perform private.flag(card.merchant_id, card.id, card.customer_id, 'cooldown', 'low', jsonb_build_object('last_earn', last_earn, 'cooldown_minutes', prog.cooldown_minutes));
        return jsonb_build_object('ok', false, 'error', 'cooldown', 'retry_at', last_earn + make_interval(mins => prog.cooldown_minutes));
      end if;

      select coalesce(sum(amount), 0) into earned_today from public.loyalty_transactions
      where card_id = card.id and kind = 'earn' and created_at >= (date_trunc('day', now() at time zone tz) at time zone tz);
      if earned_today + delta > prog.max_earn_per_day then
        perform private.flag(card.merchant_id, card.id, card.customer_id, 'daily_limit', 'medium', jsonb_build_object('earned_today', earned_today, 'requested', delta, 'max', prog.max_earn_per_day));
        return jsonb_build_object('ok', false, 'error', 'daily_limit', 'max', prog.max_earn_per_day);
      end if;

      if p_actor is not null then
        select count(*) into actor_hour from public.loyalty_transactions
        where merchant_id = card.merchant_id and performed_by = p_actor and kind = 'earn' and created_at > now() - interval '1 hour';
        if actor_hour >= 120 then
          perform private.flag(card.merchant_id, card.id, card.customer_id, 'employee_velocity', 'high', jsonb_build_object('earn_last_hour', actor_hour));
        end if;
      end if;
    end if;

    if prog.type in ('stamps', 'visits') and card.balance + delta > prog.stamps_required * 2 then
      return jsonb_build_object('ok', false, 'error', 'card_full', 'balance', card.balance);
    end if;
  elsif p_kind = 'redeem' then
    delta := -abs(p_amount);
    if card.balance + delta < 0 then return jsonb_build_object('ok', false, 'error', 'insufficient_balance', 'balance', card.balance); end if;
  else -- adjust / reverse / expire
    delta := p_amount;
    if delta = 0 then return jsonb_build_object('ok', false, 'error', 'invalid_amount'); end if;
    if card.balance + delta < 0 then return jsonb_build_object('ok', false, 'error', 'insufficient_balance', 'balance', card.balance); end if;
  end if;

  insert into public.loyalty_transactions (merchant_id, card_id, customer_id, program_id, kind, amount, balance_after, purchase_amount_millimes,
    reward_id, location_id, performed_by, source, idempotency_key, reversed_transaction_id, note)
  values (card.merchant_id, card.id, card.customer_id, card.program_id, p_kind, delta, card.balance + delta, p_purchase_millimes,
    p_reward_id, p_location_id, p_actor, p_source, p_idempotency_key, p_reversed, p_note)
  returning id into tx_id;

  update public.loyalty_cards set
    balance = balance + delta,
    lifetime_earned = lifetime_earned + greatest(delta, 0) * (p_kind = 'earn')::int,
    lifetime_redeemed = lifetime_redeemed + (case when p_kind = 'redeem' then -delta else 0 end),
    rewards_earned = rewards_earned + (p_kind = 'redeem')::int,
    last_activity_at = now()
  where id = card.id;

  if p_kind = 'earn' then
    update public.customers set last_visit_at = now(), total_visits = total_visits + 1 where id = card.customer_id;
  end if;

  perform private.enqueue_job('wallet.update', jsonb_build_object('card_id', card.id), 'card:' || card.id::text, interval '2 seconds');

  return jsonb_build_object('ok', true, 'transaction_id', tx_id, 'amount', delta, 'balance', card.balance + delta,
    'stamps_required', prog.stamps_required, 'program_type', prog.type);
end $$;

create or replace function public.apply_loyalty_transaction(
  p_card_id uuid, p_kind public.ledger_kind, p_amount int, p_idempotency_key text,
  p_location_id uuid default null, p_source text default 'dashboard', p_purchase_millimes bigint default null, p_note text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  mid uuid;
  result jsonb;
begin
  select merchant_id into mid from public.loyalty_cards where id = p_card_id;
  if mid is null then return jsonb_build_object('ok', false, 'error', 'card_not_found'); end if;
  if p_kind = 'earn' then
    if not public.has_merchant_permission(mid, 'cards.earn') then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  elsif p_kind = 'adjust' then
    if not public.has_merchant_permission(mid, 'cards.adjust') then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
    if coalesce(trim(p_note), '') = '' then return jsonb_build_object('ok', false, 'error', 'note_required'); end if;
  else
    return jsonb_build_object('ok', false, 'error', 'unsupported_kind');
  end if;
  if p_idempotency_key is null or length(p_idempotency_key) < 8 then return jsonb_build_object('ok', false, 'error', 'idempotency_key_required'); end if;

  result := private.apply_tx(p_card_id, p_kind, p_amount, p_idempotency_key, auth.uid(), p_location_id, p_source, p_purchase_millimes, p_note);
  if p_kind = 'adjust' and (result ->> 'ok')::boolean and not coalesce((result ->> 'duplicate')::boolean, false) then
    perform private.audit(mid, 'card.adjusted', 'loyalty_card', p_card_id::text, jsonb_build_object('amount', p_amount, 'note', p_note));
  end if;
  return result;
end $$;

create or replace function public.redeem_reward(p_card_id uuid, p_reward_id uuid, p_idempotency_key text, p_location_id uuid default null, p_source text default 'dashboard')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  card public.loyalty_cards;
  rw public.rewards;
  result jsonb;
  redemption_id uuid;
  redemption_code text;
begin
  select * into card from public.loyalty_cards where id = p_card_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'card_not_found'); end if;
  if not public.has_merchant_permission(card.merchant_id, 'rewards.redeem') then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;

  select * into rw from public.rewards where id = p_reward_id for update;
  if not found or rw.program_id <> card.program_id then return jsonb_build_object('ok', false, 'error', 'reward_not_found'); end if;

  if exists (select 1 from public.loyalty_transactions where merchant_id = card.merchant_id and idempotency_key = p_idempotency_key) then
    return private.apply_tx(p_card_id, 'redeem', rw.cost, p_idempotency_key, auth.uid());
  end if;
  if not rw.is_active then return jsonb_build_object('ok', false, 'error', 'reward_inactive'); end if;
  if rw.stock is not null and rw.stock <= 0 then return jsonb_build_object('ok', false, 'error', 'out_of_stock'); end if;

  result := private.apply_tx(p_card_id, 'redeem', rw.cost, p_idempotency_key, auth.uid(), p_location_id, p_source, null, rw.name, rw.id);
  if not (result ->> 'ok')::boolean then return result; end if;

  if rw.stock is not null then update public.rewards set stock = stock - 1 where id = rw.id; end if;
  insert into public.reward_redemptions (merchant_id, reward_id, card_id, customer_id, transaction_id, status, redeemed_at, redeemed_by, location_id)
  values (card.merchant_id, rw.id, card.id, card.customer_id, (result ->> 'transaction_id')::uuid, 'redeemed', now(), auth.uid(), p_location_id)
  returning id, code into redemption_id, redemption_code;
  return result || jsonb_build_object('redemption_id', redemption_id, 'redemption_code', redemption_code, 'reward', rw.name);
end $$;

create or replace function public.reverse_transaction(p_transaction_id uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  tx public.loyalty_transactions;
  result jsonb;
begin
  select * into tx from public.loyalty_transactions where id = p_transaction_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if not public.has_merchant_permission(tx.merchant_id, 'cards.adjust') then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  if tx.kind = 'reverse' then return jsonb_build_object('ok', false, 'error', 'cannot_reverse_reversal'); end if;
  if coalesce(trim(p_reason), '') = '' then return jsonb_build_object('ok', false, 'error', 'note_required'); end if;
  result := private.apply_tx(tx.card_id, 'reverse', -tx.amount, 'reverse:' || tx.id::text, auth.uid(), null, 'dashboard', null, p_reason, null, tx.id, false);
  if (result ->> 'ok')::boolean and not coalesce((result ->> 'duplicate')::boolean, false) then
    perform private.audit(tx.merchant_id, 'transaction.reversed', 'loyalty_transaction', tx.id::text, jsonb_build_object('reason', p_reason, 'amount', tx.amount));
  end if;
  return result;
end $$;

create or replace function public.redeem_coupon(p_merchant_id uuid, p_code text, p_card_id uuid, p_idempotency_key text, p_location_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  c public.coupons;
  cust uuid;
  used int;
begin
  if not public.has_merchant_permission(p_merchant_id, 'coupons.redeem') then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  if not private.merchant_is_entitled(p_merchant_id) then return jsonb_build_object('ok', false, 'error', 'subscription_inactive'); end if;
  if exists (select 1 from public.coupon_redemptions where merchant_id = p_merchant_id and idempotency_key = p_idempotency_key) then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;
  select * into c from public.coupons where merchant_id = p_merchant_id and code = upper(trim(p_code)) for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'coupon_not_found'); end if;
  if c.status <> 'active' then return jsonb_build_object('ok', false, 'error', 'coupon_inactive'); end if;
  if c.starts_at is not null and now() < c.starts_at then return jsonb_build_object('ok', false, 'error', 'coupon_not_started'); end if;
  if c.ends_at is not null and now() > c.ends_at then return jsonb_build_object('ok', false, 'error', 'coupon_expired'); end if;
  if c.max_redemptions is not null and c.redemptions_count >= c.max_redemptions then return jsonb_build_object('ok', false, 'error', 'coupon_exhausted'); end if;
  if p_card_id is not null then
    select customer_id into cust from public.loyalty_cards where id = p_card_id and merchant_id = p_merchant_id;
    if cust is null then return jsonb_build_object('ok', false, 'error', 'card_not_found'); end if;
    select count(*) into used from public.coupon_redemptions where coupon_id = c.id and customer_id = cust;
    if used >= c.per_customer_limit then
      perform private.flag(p_merchant_id, p_card_id, cust, 'coupon_reuse', 'medium', jsonb_build_object('coupon', c.code, 'used', used));
      return jsonb_build_object('ok', false, 'error', 'coupon_already_used');
    end if;
  end if;
  insert into public.coupon_redemptions (merchant_id, coupon_id, customer_id, card_id, location_id, redeemed_by, idempotency_key)
  values (p_merchant_id, c.id, cust, p_card_id, p_location_id, auth.uid(), p_idempotency_key);
  update public.coupons set redemptions_count = redemptions_count + 1 where id = c.id;
  return jsonb_build_object('ok', true, 'coupon', c.name, 'kind', c.kind, 'value', c.value);
end $$;

-- ───────────── Public enrolment (called by the VAYRO server only, after IP rate-limiting) ─────────────
create or replace function public.enroll_customer(
  p_link_code text, p_first_name text, p_last_name text, p_phone text, p_email text,
  p_birthday date default null, p_marketing_consent boolean default false, p_locale text default 'fr'
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  link public.enrollment_links;
  prog public.loyalty_programs;
  cust public.customers;
  card public.loyalty_cards;
begin
  select * into link from public.enrollment_links where code = lower(p_link_code) for update;
  if not found or not link.is_active then return jsonb_build_object('ok', false, 'error', 'link_invalid'); end if;
  if link.expires_at is not null and link.expires_at < now() then return jsonb_build_object('ok', false, 'error', 'link_expired'); end if;
  if link.max_uses is not null and link.uses >= link.max_uses then return jsonb_build_object('ok', false, 'error', 'link_exhausted'); end if;
  if not private.merchant_is_entitled(link.merchant_id) then return jsonb_build_object('ok', false, 'error', 'merchant_unavailable'); end if;
  select * into prog from public.loyalty_programs where id = link.program_id;
  if prog.status <> 'active' then return jsonb_build_object('ok', false, 'error', 'program_inactive'); end if;
  if link.require_phone and p_phone is null then return jsonb_build_object('ok', false, 'error', 'phone_required'); end if;
  if link.require_email and p_email is null then return jsonb_build_object('ok', false, 'error', 'email_required'); end if;

  select * into cust from public.customers
  where merchant_id = link.merchant_id and deleted_at is null
    and ((p_phone is not null and phone = p_phone) or (p_email is not null and email = p_email::extensions.citext))
  limit 1;

  if found then
    if exists (select 1 from public.loyalty_cards where program_id = prog.id and customer_id = cust.id) then
      -- Never reveal an existing card's link to whoever types a phone number.
      return jsonb_build_object('ok', false, 'error', 'already_enrolled');
    end if;
  else
    insert into public.customers (merchant_id, first_name, last_name, phone, email, birthday, marketing_consent, consent_at, locale, source, enrolled_location_id)
    values (link.merchant_id, trim(p_first_name), nullif(trim(p_last_name), ''), p_phone, p_email, p_birthday, p_marketing_consent,
      case when p_marketing_consent then now() end, coalesce(p_locale, 'fr'), 'enrollment', link.location_id)
    returning * into cust;
  end if;

  insert into public.loyalty_cards (merchant_id, program_id, customer_id) values (link.merchant_id, prog.id, cust.id) returning * into card;
  update public.enrollment_links set uses = uses + 1 where id = link.id;

  if prog.welcome_bonus > 0 then
    perform private.apply_tx(card.id, 'earn', prog.welcome_bonus, 'welcome:' || card.id::text, null, link.location_id, 'enrollment', null, 'Bonus de bienvenue', null, null, false);
  end if;

  insert into public.notifications (merchant_id, type, title, body, link)
  values (link.merchant_id, 'customer.enrolled', 'Nouveau client inscrit', trim(p_first_name) || ' a rejoint ' || prog.name, '/dashboard/customers/' || cust.id::text);

  return jsonb_build_object('ok', true, 'card_token', card.public_token, 'card_id', card.id, 'customer_id', cust.id);
end $$;

-- ───────────── Billing ─────────────
create or replace function public.request_subscription_invoice(p_merchant_id uuid, p_price_id uuid, p_quantity int default 1)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  pr public.plan_prices;
  sub public.subscriptions;
  inv_id uuid;
begin
  if not public.has_merchant_permission(p_merchant_id, 'billing.manage') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_quantity < 1 or p_quantity > 1000 then raise exception 'invalid_quantity'; end if;
  select * into pr from public.plan_prices where id = p_price_id and is_active;
  if not found then raise exception 'price_not_found'; end if;
  select * into sub from public.subscriptions where merchant_id = p_merchant_id;
  -- void previous open invoices: only one pending request at a time
  update public.invoices set status = 'void' where merchant_id = p_merchant_id and status = 'open';
  insert into public.invoices (merchant_id, subscription_id, number, status, currency, subtotal_millimes, total_millimes, line_items, due_at)
  values (p_merchant_id, sub.id, 'VAY-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.invoice_number_seq')::text, 6, '0'), 'open', pr.currency,
    pr.amount_millimes * p_quantity, pr.amount_millimes * p_quantity,
    jsonb_build_array(jsonb_build_object('price_id', pr.id, 'period', pr.period, 'interval_months', pr.interval_months, 'quantity', p_quantity, 'unit_amount_millimes', pr.amount_millimes)),
    now() + interval '7 days')
  returning id into inv_id;
  perform private.audit(p_merchant_id, 'billing.invoice_requested', 'invoice', inv_id::text, jsonb_build_object('price_id', p_price_id, 'quantity', p_quantity));
  return inv_id;
end $$;

-- Super admin records a cash (or other offline) payment → invoice paid → subscription extended.
create or replace function public.admin_record_payment(
  p_merchant_id uuid, p_price_id uuid, p_quantity int, p_amount_millimes bigint, p_method public.payment_method,
  p_reference text default null, p_notes text default null, p_invoice_id uuid default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  pr public.plan_prices;
  sub public.subscriptions;
  inv public.invoices;
  v_start timestamptz;
  v_end timestamptz;
  pay_id uuid;
begin
  if not public.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into pr from public.plan_prices where id = p_price_id;
  if not found then raise exception 'price_not_found'; end if;
  select * into sub from public.subscriptions where merchant_id = p_merchant_id for update;
  if not found then raise exception 'subscription_not_found'; end if;

  v_start := case when sub.status in ('active', 'past_due') and sub.current_period_end > now() then sub.current_period_end else now() end;
  v_end := v_start + make_interval(months => pr.interval_months);

  if p_invoice_id is not null then
    select * into inv from public.invoices where id = p_invoice_id and merchant_id = p_merchant_id for update;
    if not found then raise exception 'invoice_not_found'; end if;
    if inv.status = 'paid' then raise exception 'invoice_already_paid'; end if;
    update public.invoices set status = 'paid', paid_at = now(), period_start = v_start, period_end = v_end where id = inv.id;
  else
    insert into public.invoices (merchant_id, subscription_id, number, status, currency, subtotal_millimes, total_millimes, period_start, period_end, line_items, paid_at)
    values (p_merchant_id, sub.id, 'VAY-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.invoice_number_seq')::text, 6, '0'), 'paid', pr.currency,
      p_amount_millimes, p_amount_millimes, v_start, v_end,
      jsonb_build_array(jsonb_build_object('price_id', pr.id, 'period', pr.period, 'interval_months', pr.interval_months, 'quantity', p_quantity, 'unit_amount_millimes', pr.amount_millimes)), now())
    returning * into inv;
  end if;

  insert into public.payments (merchant_id, invoice_id, amount_millimes, currency, method, reference, received_by, notes)
  values (p_merchant_id, inv.id, p_amount_millimes, pr.currency, p_method, p_reference, auth.uid(), p_notes)
  returning id into pay_id;

  update public.subscriptions set
    plan_id = pr.plan_id, price_id = pr.id, quantity = p_quantity, status = 'active',
    current_period_start = case when sub.status in ('active', 'past_due') and sub.current_period_end > now() then coalesce(sub.current_period_start, v_start) else v_start end,
    current_period_end = v_end, cancel_at_period_end = false, canceled_at = null
  where id = sub.id;

  insert into public.notifications (merchant_id, type, title, body, link)
  values (p_merchant_id, 'billing.payment_received', 'Paiement reçu', 'Votre abonnement est actif jusqu''au ' || to_char(v_end at time zone 'Africa/Tunis', 'DD/MM/YYYY') || '.', '/dashboard/billing');

  perform private.audit(p_merchant_id, 'billing.payment_recorded', 'payment', pay_id::text,
    jsonb_build_object('amount_millimes', p_amount_millimes, 'method', p_method, 'reference', p_reference, 'period_end', v_end), 'admin');
  return jsonb_build_object('ok', true, 'payment_id', pay_id, 'invoice_id', inv.id, 'current_period_end', v_end);
end $$;

create or replace function public.admin_set_merchant_status(p_merchant_id uuid, p_status public.merchant_status, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.merchants set status = p_status,
    suspended_reason = case when p_status = 'suspended' then p_reason end,
    suspended_at = case when p_status = 'suspended' then now() end
  where id = p_merchant_id;
  perform private.audit(p_merchant_id, 'merchant.status_changed', 'merchant', p_merchant_id::text, jsonb_build_object('status', p_status, 'reason', p_reason), 'admin');
end $$;

create or replace function public.admin_extend_trial(p_merchant_id uuid, p_days int)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_days < 1 or p_days > 365 then raise exception 'invalid_days'; end if;
  update public.subscriptions set status = 'trialing', trial_ends_at = greatest(coalesce(trial_ends_at, now()), now()) + make_interval(days => p_days)
  where merchant_id = p_merchant_id and status in ('trialing', 'expired');
  perform private.audit(p_merchant_id, 'billing.trial_extended', 'subscription', p_merchant_id::text, jsonb_build_object('days', p_days), 'admin');
end $$;

-- Daily maintenance: trials & periods → past_due / expired
create or replace function private.run_subscription_maintenance()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare a int; b int; c int;
begin
  update public.subscriptions set status = 'expired' where status = 'trialing' and trial_ends_at < now();
  get diagnostics a = row_count;
  update public.subscriptions set status = 'past_due' where status = 'active' and current_period_end < now();
  get diagnostics b = row_count;
  update public.subscriptions set status = 'expired' where status = 'past_due' and current_period_end < now() - interval '3 days';
  get diagnostics c = row_count;
  insert into public.system_logs (level, source, message, context)
  values ('info', 'cron.subscriptions', 'Subscription maintenance', jsonb_build_object('trials_expired', a, 'past_due', b, 'expired', c));
  return jsonb_build_object('trials_expired', a, 'past_due', b, 'expired', c);
end $$;
