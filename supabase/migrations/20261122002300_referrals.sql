-- VAYRO · 0023 · Referrals ("parrainage").
-- A customer shares their personal link; a friend signs up with it (new customer only) → referral is "pending".
-- On the friend's FIRST real visit (first earn scanned by staff), both cards get the program's referral reward once.
-- After that each card lives on its own.

alter table public.loyalty_programs
  add column referral_enabled boolean not null default true,
  add column referral_reward int not null default 1 check (referral_reward between 1 and 1000);
grant insert (referral_enabled, referral_reward) on public.loyalty_programs to authenticated;
grant update (referral_enabled, referral_reward) on public.loyalty_programs to authenticated;

-- Referral bonuses are their own ledger source.
alter table public.loyalty_transactions drop constraint loyalty_transactions_source_check;
alter table public.loyalty_transactions add constraint loyalty_transactions_source_check
  check (source in ('dashboard', 'scanner', 'enrollment', 'api', 'system', 'nfc', 'referral'));

-- Personal share code per card (volatile default → every existing card gets its own code).
alter table public.loyalty_cards add column referral_code text not null default private.random_code(8);
create unique index loyalty_cards_referral_code_uniq on public.loyalty_cards (referral_code);

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  program_id uuid not null references public.loyalty_programs (id) on delete cascade,
  referrer_card_id uuid not null references public.loyalty_cards (id) on delete cascade,
  referrer_customer_id uuid not null references public.customers (id) on delete cascade,
  referred_card_id uuid not null unique references public.loyalty_cards (id) on delete cascade,
  referred_customer_id uuid not null references public.customers (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'completed', 'canceled')),
  reward int,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check (referrer_customer_id <> referred_customer_id)
);
create index referrals_merchant_idx on public.referrals (merchant_id, created_at desc);
create index referrals_referrer_idx on public.referrals (referrer_card_id);
create index referrals_referred_customer_idx on public.referrals (referred_customer_id);

alter table public.referrals enable row level security;
alter table public.referrals force row level security;
grant select on public.referrals to authenticated;
grant all on public.referrals to service_role;
create policy "read referrals" on public.referrals for select to authenticated using ((select public.has_merchant_permission(merchant_id, 'customers.view')));

-- ───────── enrolment with an optional referral code ─────────
drop function public.enroll_customer(text, text, text, text, text, date, boolean, text);
create function public.enroll_customer(
  p_link_code text, p_first_name text, p_last_name text, p_phone text, p_email text,
  p_birthday date default null, p_marketing_consent boolean default false, p_locale text default 'fr',
  p_referral_code text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  link public.enrollment_links;
  prog public.loyalty_programs;
  cust public.customers;
  card public.loyalty_cards;
  ref_card public.loyalty_cards;
  is_new boolean := false;
  referrer_name text;
  referred boolean := false;
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
    is_new := true;
  end if;

  insert into public.loyalty_cards (merchant_id, program_id, customer_id) values (link.merchant_id, prog.id, cust.id) returning * into card;
  update public.enrollment_links set uses = uses + 1 where id = link.id;

  if prog.welcome_bonus > 0 then
    perform private.apply_tx(card.id, 'earn', prog.welcome_bonus, 'welcome:' || card.id::text, null, link.location_id, 'enrollment', null, 'Bonus de bienvenue', null, null, false);
  end if;

  -- Referral: only a brand-new customer of this merchant, invited from an active card of the same program, at most 20 invitations a day per card.
  if p_referral_code is not null and is_new and prog.referral_enabled then
    select * into ref_card from public.loyalty_cards
    where referral_code = upper(trim(p_referral_code)) and program_id = prog.id and status = 'active' and customer_id <> cust.id;
    if found and (select count(*) from public.referrals where referrer_card_id = ref_card.id and created_at > now() - interval '1 day') < 20 then
      insert into public.referrals (merchant_id, program_id, referrer_card_id, referrer_customer_id, referred_card_id, referred_customer_id)
      values (link.merchant_id, prog.id, ref_card.id, ref_card.customer_id, card.id, cust.id);
      referred := true;
      select first_name into referrer_name from public.customers where id = ref_card.customer_id;
    end if;
  end if;

  insert into public.notifications (merchant_id, type, title, body, link)
  values (link.merchant_id, case when referred then 'customer.referred' else 'customer.enrolled' end,
    case when referred then 'Nouveau client parrainé' else 'Nouveau client inscrit' end,
    trim(p_first_name) || ' a rejoint ' || prog.name || case when referred then ' (invité par ' || coalesce(referrer_name, '?') || ')' else '' end,
    '/dashboard/customers/' || cust.id::text);

  return jsonb_build_object('ok', true, 'card_token', card.public_token, 'card_id', card.id, 'customer_id', cust.id, 'referred', referred);
end $$;
revoke all on function public.enroll_customer(text, text, text, text, text, date, boolean, text, text) from public, anon, authenticated;
grant execute on function public.enroll_customer(text, text, text, text, text, date, boolean, text, text) to service_role;

-- ───────── reward on the friend's first real visit ─────────
-- Deferred to commit, so it runs after apply_tx has updated the card: the bonus is booked as its own ledger lines.
create or replace function private.complete_referral_on_visit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  r public.referrals;
  amt int;
  a jsonb;
  b jsonb;
  referred_name text;
  referrer_name text;
begin
  if new.kind <> 'earn' or new.amount <= 0 or new.source in ('enrollment', 'referral') then return null; end if;
  select * into r from public.referrals where referred_card_id = new.card_id and status = 'pending' for update;
  if not found then return null; end if;
  select coalesce(referral_reward, 1) into amt from public.loyalty_programs where id = r.program_id;
  begin
    b := private.apply_tx(r.referred_card_id, 'earn', amt, 'referral:' || r.id::text || ':referred', null, new.location_id, 'referral', null, 'Parrainage : bonus filleul', null, null, false);
    a := private.apply_tx(r.referrer_card_id, 'earn', amt, 'referral:' || r.id::text || ':referrer', null, new.location_id, 'referral', null, 'Parrainage : ami venu', null, null, false);
  exception when others then
    insert into public.system_logs (level, source, message, context) values ('error', 'referral.complete', sqlerrm, jsonb_build_object('referral_id', r.id));
    return null;
  end;
  update public.referrals set status = 'completed', completed_at = now(), reward = amt where id = r.id;
  select first_name into referred_name from public.customers where id = r.referred_customer_id;
  select first_name into referrer_name from public.customers where id = r.referrer_customer_id;
  insert into public.notifications (merchant_id, type, title, body, link)
  values (r.merchant_id, 'referral.completed', 'Parrainage validé',
    coalesce(referred_name, '?') || ' est venu(e) grâce à ' || coalesce(referrer_name, '?') || ' : +' || amt || ' pour chacun'
      || case when not coalesce((a ->> 'ok')::boolean, false) then ' (parrain : ' || coalesce(a ->> 'error', 'erreur') || ')' else '' end,
    '/dashboard/customers/' || r.referred_customer_id::text);
  return null;
end $$;

create constraint trigger loyalty_transactions_referral
  after insert on public.loyalty_transactions
  deferrable initially deferred
  for each row execute function private.complete_referral_on_visit();
