-- VAYRO · 0006 · Row Level Security, column grants, function privileges, storage policies
-- Principle: deny by default. Clients (anon/authenticated) get only what is granted here.
-- Balances, ledger, billing and secrets are never writable from the client: only via functions or the server.

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['profiles','platform_admins','merchants','roles','locations','merchant_members','invitations',
    'loyalty_programs','card_designs','customers','loyalty_cards','loyalty_transactions','rewards','reward_redemptions',
    'enrollment_links','coupons','coupon_redemptions','campaigns','campaign_deliveries','notifications','integrations',
    'wallet_passes','apple_device_registrations','plans','plan_prices','subscriptions','invoices','payments',
    'payment_provider_events','fraud_signals','api_keys','audit_logs','system_logs','platform_settings']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('create policy "platform admins read all" on public.%I for select to authenticated using ((select public.is_platform_admin()))', t);
  end loop;
end $$;

-- ───────── profiles ─────────
grant select on public.profiles to authenticated;
grant update (full_name, phone, avatar_path, locale, last_merchant_id) on public.profiles to authenticated;
create policy "own profile" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "co-member profiles" on public.profiles for select to authenticated using (
  exists (select 1 from public.merchant_members a join public.merchant_members b on a.merchant_id = b.merchant_id
          where a.user_id = (select auth.uid()) and a.status = 'active' and b.user_id = profiles.id));
create policy "update own profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ───────── platform_admins ─────────
grant select on public.platform_admins to authenticated;
create policy "see own admin row" on public.platform_admins for select to authenticated using (user_id = (select auth.uid()));

-- ───────── merchants ─────────
grant select on public.merchants to authenticated;
grant update (name, legal_name, tax_id, email, phone, website, address, city, timezone, locale, industry, logo_path, brand_color, accent_color, settings, onboarding_completed_at) on public.merchants to authenticated;
create policy "members read merchant" on public.merchants for select to authenticated using ((select public.is_merchant_member(id)));
create policy "settings managers update merchant" on public.merchants for update to authenticated
  using ((select public.has_merchant_permission(id, 'settings.manage'))) with check ((select public.has_merchant_permission(id, 'settings.manage')));

-- ───────── roles ─────────
grant select on public.roles to authenticated;
grant insert (merchant_id, key, name, description, permissions) on public.roles to authenticated;
grant update (name, description, permissions) on public.roles to authenticated;
grant delete on public.roles to authenticated;
create policy "members read roles" on public.roles for select to authenticated using ((select public.is_merchant_member(merchant_id)));
create policy "manage custom roles insert" on public.roles for insert to authenticated
  with check ((select public.has_merchant_permission(merchant_id, 'roles.manage')) and not is_system and not ('*' = any (permissions)));
create policy "manage roles update" on public.roles for update to authenticated
  using ((select public.has_merchant_permission(merchant_id, 'roles.manage')) and key <> 'owner')
  with check (key <> 'owner' and not ('*' = any (permissions)));
create policy "manage custom roles delete" on public.roles for delete to authenticated
  using ((select public.has_merchant_permission(merchant_id, 'roles.manage')) and not is_system);

-- ───────── locations ─────────
grant select, delete on public.locations to authenticated;
grant insert (merchant_id, name, address, city, phone, latitude, longitude, nfc_reader_id, is_active) on public.locations to authenticated;
grant update (name, address, city, phone, latitude, longitude, nfc_reader_id, is_active) on public.locations to authenticated;
create policy "members read locations" on public.locations for select to authenticated using ((select public.is_merchant_member(merchant_id)));
create policy "manage locations insert" on public.locations for insert to authenticated with check ((select public.has_merchant_permission(merchant_id, 'locations.manage')));
create policy "manage locations update" on public.locations for update to authenticated using ((select public.has_merchant_permission(merchant_id, 'locations.manage')));
create policy "manage locations delete" on public.locations for delete to authenticated using ((select public.has_merchant_permission(merchant_id, 'locations.manage')));

create or replace function private.enforce_location_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare q int;
begin
  select quantity into q from public.subscriptions where merchant_id = new.merchant_id;
  if q is not null and new.is_active and (select count(*) from public.locations where merchant_id = new.merchant_id and is_active and id <> new.id) >= q then
    raise exception 'location_limit_reached' using errcode = 'P0001', hint = 'Upgrade the number of points of sale in Billing.';
  end if;
  return new;
end $$;
create trigger locations_limit before insert or update of is_active on public.locations for each row execute function private.enforce_location_limit();

-- ───────── merchant_members ─────────
grant select on public.merchant_members to authenticated;
grant update (role_id, status, title, location_ids) on public.merchant_members to authenticated;
grant delete on public.merchant_members to authenticated;
create policy "members read team" on public.merchant_members for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_merchant_member(merchant_id)));
create policy "employees managers update" on public.merchant_members for update to authenticated
  using ((select public.has_merchant_permission(merchant_id, 'employees.manage')) and user_id <> (select auth.uid())
         and role_id not in (select id from public.roles where key = 'owner'))
  with check (role_id not in (select id from public.roles where key = 'owner')
              and role_id in (select id from public.roles r where r.merchant_id = merchant_members.merchant_id));
create policy "employees managers delete" on public.merchant_members for delete to authenticated
  using ((select public.has_merchant_permission(merchant_id, 'employees.manage')) and user_id <> (select auth.uid())
         and role_id not in (select id from public.roles where key = 'owner'));

-- ───────── invitations ─────────
grant select (id, merchant_id, email, role_id, location_ids, invited_by, expires_at, accepted_at, revoked_at, created_at) on public.invitations to authenticated;
grant update (revoked_at) on public.invitations to authenticated;
create policy "employees managers read invitations" on public.invitations for select to authenticated using ((select public.has_merchant_permission(merchant_id, 'employees.manage')));
create policy "employees managers revoke invitations" on public.invitations for update to authenticated using ((select public.has_merchant_permission(merchant_id, 'employees.manage')));

-- ───────── loyalty programs, card designs, rewards, enrolment links ─────────
grant select, delete on public.loyalty_programs, public.card_designs, public.rewards, public.enrollment_links to authenticated;
grant insert (merchant_id, name, description, type, status, stamps_required, points_per_unit, welcome_bonus, reward_title, cooldown_minutes, max_earn_per_day, max_earn_per_transaction, points_expire_days, terms, settings) on public.loyalty_programs to authenticated;
grant update (name, description, status, stamps_required, points_per_unit, welcome_bonus, reward_title, cooldown_minutes, max_earn_per_day, max_earn_per_transaction, points_expire_days, terms, settings) on public.loyalty_programs to authenticated;
grant insert, update on public.card_designs to authenticated;
grant insert (merchant_id, program_id, name, description, cost, image_path, stock, valid_days, is_active, sort) on public.rewards to authenticated;
grant update (name, description, cost, image_path, stock, valid_days, is_active, sort) on public.rewards to authenticated;
grant insert (merchant_id, program_id, location_id, name, is_active, require_phone, require_email, collect_birthday, max_uses, expires_at) on public.enrollment_links to authenticated;
grant update (name, location_id, is_active, require_phone, require_email, collect_birthday, max_uses, expires_at) on public.enrollment_links to authenticated;

create policy "members read programs" on public.loyalty_programs for select to authenticated using ((select public.is_merchant_member(merchant_id)));
create policy "manage programs ins" on public.loyalty_programs for insert to authenticated with check ((select public.has_merchant_permission(merchant_id, 'programs.manage')));
create policy "manage programs upd" on public.loyalty_programs for update to authenticated using ((select public.has_merchant_permission(merchant_id, 'programs.manage')));
create policy "manage programs del" on public.loyalty_programs for delete to authenticated using ((select public.has_merchant_permission(merchant_id, 'programs.manage')) and status = 'draft');

create policy "members read designs" on public.card_designs for select to authenticated using ((select public.is_merchant_member(merchant_id)));
create policy "manage designs ins" on public.card_designs for insert to authenticated with check ((select public.has_merchant_permission(merchant_id, 'programs.manage'))
  and exists (select 1 from public.loyalty_programs p where p.id = program_id and p.merchant_id = card_designs.merchant_id));
create policy "manage designs upd" on public.card_designs for update to authenticated using ((select public.has_merchant_permission(merchant_id, 'programs.manage')))
  with check (exists (select 1 from public.loyalty_programs p where p.id = program_id and p.merchant_id = card_designs.merchant_id));
create policy "manage designs del" on public.card_designs for delete to authenticated using ((select public.has_merchant_permission(merchant_id, 'programs.manage')));

create policy "members read rewards" on public.rewards for select to authenticated using ((select public.is_merchant_member(merchant_id)));
create policy "manage rewards ins" on public.rewards for insert to authenticated with check ((select public.has_merchant_permission(merchant_id, 'rewards.manage'))
  and exists (select 1 from public.loyalty_programs p where p.id = program_id and p.merchant_id = rewards.merchant_id));
create policy "manage rewards upd" on public.rewards for update to authenticated using ((select public.has_merchant_permission(merchant_id, 'rewards.manage')));
create policy "manage rewards del" on public.rewards for delete to authenticated using ((select public.has_merchant_permission(merchant_id, 'rewards.manage')));

create policy "members read links" on public.enrollment_links for select to authenticated using ((select public.is_merchant_member(merchant_id)));
create policy "manage links ins" on public.enrollment_links for insert to authenticated with check ((select public.has_merchant_permission(merchant_id, 'programs.manage'))
  and exists (select 1 from public.loyalty_programs p where p.id = program_id and p.merchant_id = enrollment_links.merchant_id));
create policy "manage links upd" on public.enrollment_links for update to authenticated using ((select public.has_merchant_permission(merchant_id, 'programs.manage')));
create policy "manage links del" on public.enrollment_links for delete to authenticated using ((select public.has_merchant_permission(merchant_id, 'programs.manage')));

-- ───────── customers & cards ─────────
grant select on public.customers to authenticated;
grant insert (merchant_id, first_name, last_name, email, phone, birthday, gender, locale, marketing_consent, consent_at, tags, notes, source, enrolled_location_id) on public.customers to authenticated;
grant update (first_name, last_name, email, phone, birthday, gender, locale, marketing_consent, consent_at, tags, notes, deleted_at) on public.customers to authenticated;
create policy "read customers" on public.customers for select to authenticated using ((select public.has_merchant_permission(merchant_id, 'customers.view')));
create policy "create customers" on public.customers for insert to authenticated with check ((select public.has_merchant_permission(merchant_id, 'customers.manage')));
create policy "update customers" on public.customers for update to authenticated using ((select public.has_merchant_permission(merchant_id, 'customers.manage')));

grant select (id, merchant_id, program_id, customer_id, serial, balance, lifetime_earned, lifetime_redeemed, rewards_earned, status, last_activity_at, created_at, updated_at) on public.loyalty_cards to authenticated;
grant insert (merchant_id, program_id, customer_id) on public.loyalty_cards to authenticated;
grant update (status) on public.loyalty_cards to authenticated;
create policy "read cards" on public.loyalty_cards for select to authenticated using ((select public.has_merchant_permission(merchant_id, 'customers.view')));
create policy "issue cards" on public.loyalty_cards for insert to authenticated with check (
  (select public.has_merchant_permission(merchant_id, 'customers.manage'))
  and exists (select 1 from public.loyalty_programs p where p.id = program_id and p.merchant_id = loyalty_cards.merchant_id)
  and exists (select 1 from public.customers c where c.id = customer_id and c.merchant_id = loyalty_cards.merchant_id));
create policy "update card status" on public.loyalty_cards for update to authenticated using ((select public.has_merchant_permission(merchant_id, 'cards.adjust')));

grant select on public.loyalty_transactions, public.reward_redemptions to authenticated;
create policy "read ledger" on public.loyalty_transactions for select to authenticated using (
  (select public.has_merchant_permission(merchant_id, 'transactions.view')) or (select public.has_merchant_permission(merchant_id, 'customers.view')));
create policy "read redemptions" on public.reward_redemptions for select to authenticated using (
  (select public.has_merchant_permission(merchant_id, 'transactions.view')) or (select public.has_merchant_permission(merchant_id, 'customers.view')));

-- ───────── coupons ─────────
grant select, delete on public.coupons to authenticated;
grant insert (merchant_id, program_id, name, description, code, kind, value, status, starts_at, ends_at, max_redemptions, per_customer_limit, min_purchase_millimes, terms) on public.coupons to authenticated;
grant update (program_id, name, description, kind, value, status, starts_at, ends_at, max_redemptions, per_customer_limit, min_purchase_millimes, terms) on public.coupons to authenticated;
grant select on public.coupon_redemptions to authenticated;
create policy "members read coupons" on public.coupons for select to authenticated using ((select public.is_merchant_member(merchant_id)));
create policy "manage coupons ins" on public.coupons for insert to authenticated with check ((select public.has_merchant_permission(merchant_id, 'coupons.manage')));
create policy "manage coupons upd" on public.coupons for update to authenticated using ((select public.has_merchant_permission(merchant_id, 'coupons.manage')));
create policy "manage coupons del" on public.coupons for delete to authenticated using ((select public.has_merchant_permission(merchant_id, 'coupons.manage')) and redemptions_count = 0);
create policy "members read coupon redemptions" on public.coupon_redemptions for select to authenticated using ((select public.is_merchant_member(merchant_id)));

-- ───────── campaigns & notifications ─────────
grant select, delete on public.campaigns to authenticated;
grant insert (merchant_id, name, channel, program_id, segment, subject, content, coupon_id, scheduled_at, created_by) on public.campaigns to authenticated;
grant update (name, channel, program_id, segment, subject, content, coupon_id, scheduled_at, status) on public.campaigns to authenticated;
grant select on public.campaign_deliveries to authenticated;
create policy "campaign managers read" on public.campaigns for select to authenticated using ((select public.has_merchant_permission(merchant_id, 'campaigns.manage')));
create policy "campaign managers ins" on public.campaigns for insert to authenticated with check ((select public.has_merchant_permission(merchant_id, 'campaigns.manage')) and status = 'draft');
create policy "campaign managers upd" on public.campaigns for update to authenticated
  using ((select public.has_merchant_permission(merchant_id, 'campaigns.manage')) and status in ('draft', 'scheduled'))
  with check (status in ('draft', 'scheduled', 'canceled'));
create policy "campaign managers del" on public.campaigns for delete to authenticated using ((select public.has_merchant_permission(merchant_id, 'campaigns.manage')) and status = 'draft');
create policy "campaign managers read deliveries" on public.campaign_deliveries for select to authenticated using ((select public.has_merchant_permission(merchant_id, 'campaigns.manage')));

grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
create policy "read own notifications" on public.notifications for select to authenticated
  using ((user_id = (select auth.uid())) or (user_id is null and merchant_id is not null and (select public.is_merchant_member(merchant_id))));
create policy "mark notifications read" on public.notifications for update to authenticated
  using ((user_id = (select auth.uid())) or (user_id is null and merchant_id is not null and (select public.is_merchant_member(merchant_id))));

-- ───────── integrations, wallet, api keys (secrets never selectable) ─────────
grant select (id, merchant_id, provider, config, secret_hints, status, last_verified_at, last_error, updated_by, created_at, updated_at) on public.integrations to authenticated;
create policy "integration managers read" on public.integrations for select to authenticated
  using (merchant_id is not null and (select public.has_merchant_permission(merchant_id, 'integrations.manage')));
grant select (id, merchant_id, card_id, platform, serial_number, version, installed_at, removed_at, last_updated_at, created_at) on public.wallet_passes to authenticated;
create policy "read wallet passes" on public.wallet_passes for select to authenticated using ((select public.has_merchant_permission(merchant_id, 'customers.view')));
grant select (id, merchant_id, name, prefix, scopes, last_used_at, revoked_at, created_by, created_at) on public.api_keys to authenticated;
create policy "integration managers read api keys" on public.api_keys for select to authenticated using ((select public.has_merchant_permission(merchant_id, 'integrations.manage')));

-- ───────── billing ─────────
grant select on public.plans, public.plan_prices to anon, authenticated;
create policy "public plans" on public.plans for select to anon, authenticated using (is_active and is_public);
create policy "public prices" on public.plan_prices for select to anon, authenticated using (is_active and exists (select 1 from public.plans p where p.id = plan_id and p.is_active and p.is_public));
grant select on public.subscriptions, public.invoices, public.payments to authenticated;
create policy "members read subscription" on public.subscriptions for select to authenticated using ((select public.is_merchant_member(merchant_id)));
create policy "billing read invoices" on public.invoices for select to authenticated using ((select public.has_merchant_permission(merchant_id, 'billing.manage')));
create policy "billing read payments" on public.payments for select to authenticated using ((select public.has_merchant_permission(merchant_id, 'billing.manage')));
grant select on public.payment_provider_events to authenticated; -- admins only via base policy

-- ───────── security & logs ─────────
grant select on public.fraud_signals to authenticated;
grant update (reviewed_at, reviewed_by) on public.fraud_signals to authenticated;
create policy "read fraud signals" on public.fraud_signals for select to authenticated using ((select public.has_merchant_permission(merchant_id, 'transactions.view')));
create policy "review fraud signals" on public.fraud_signals for update to authenticated using ((select public.has_merchant_permission(merchant_id, 'cards.adjust')))
  with check (reviewed_by = (select auth.uid()));
grant select on public.audit_logs, public.system_logs, public.platform_settings to authenticated;
create policy "settings managers read audit" on public.audit_logs for select to authenticated using (merchant_id is not null and (select public.has_merchant_permission(merchant_id, 'settings.manage')));

-- ───────── function privileges ─────────
grant usage on schema public to anon, authenticated;
grant execute on function public.is_platform_admin(), public.is_merchant_member(uuid), public.has_merchant_permission(uuid, text),
  public.my_permissions(uuid), public.merchant_is_entitled(uuid),
  public.create_merchant(text, text, text, text, text, text),
  public.apply_loyalty_transaction(uuid, public.ledger_kind, int, text, uuid, text, bigint, text),
  public.redeem_reward(uuid, uuid, text, uuid, text), public.reverse_transaction(uuid, text),
  public.redeem_coupon(uuid, text, uuid, text, uuid), public.request_subscription_invoice(uuid, uuid, int),
  public.admin_record_payment(uuid, uuid, int, bigint, public.payment_method, text, text, uuid),
  public.admin_set_merchant_status(uuid, public.merchant_status, text), public.admin_extend_trial(uuid, int)
  to authenticated;
-- server-only (service_role)
grant execute on function public.enroll_customer(text, text, text, text, text, date, boolean, text), public.check_rate_limit(text, int, int) to service_role;

-- ───────── storage: public brand assets, namespaced by merchant id ─────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brand-assets', 'brand-assets', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.can_write_brand_asset(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.merchants m
    where m.id::text = (storage.foldername(object_name))[1]
      and (public.has_merchant_permission(m.id, 'settings.manage') or public.has_merchant_permission(m.id, 'programs.manage'))
  );
$$;
grant usage on schema private to authenticated;
grant execute on function private.can_write_brand_asset(text) to authenticated;

create policy "brand assets insert" on storage.objects for insert to authenticated with check (bucket_id = 'brand-assets' and private.can_write_brand_asset(name));
create policy "brand assets update" on storage.objects for update to authenticated using (bucket_id = 'brand-assets' and private.can_write_brand_asset(name));
create policy "brand assets delete" on storage.objects for delete to authenticated using (bucket_id = 'brand-assets' and private.can_write_brand_asset(name));
