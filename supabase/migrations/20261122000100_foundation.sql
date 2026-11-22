-- VAYRO · 0001 · Foundation: extensions, private schema, shared helpers, enums
create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- updated_at maintenance
create or replace function private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- URL-safe random token (base64url, no padding)
create or replace function private.random_token(bytes int default 24)
returns text language sql volatile set search_path = '' as $$
  select translate(rtrim(encode(extensions.gen_random_bytes(bytes), 'base64'), '='), '+/', '-_');
$$;

-- Human friendly code, unambiguous alphabet (no 0/O/1/I)
create or replace function private.random_code(len int default 8)
returns text language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  b bytea := extensions.gen_random_bytes(len);
begin
  for i in 0..len - 1 loop
    result := result || substr(alphabet, (get_byte(b, i) % 32) + 1, 1);
  end loop;
  return result;
end $$;

-- Enums
create type public.merchant_status as enum ('active', 'suspended', 'closed');
create type public.member_status as enum ('active', 'invited', 'disabled');
create type public.program_type as enum ('stamps', 'points', 'visits');
create type public.program_status as enum ('draft', 'active', 'paused', 'archived');
create type public.card_status as enum ('active', 'blocked', 'archived');
create type public.ledger_kind as enum ('earn', 'redeem', 'adjust', 'expire', 'reverse');
create type public.redemption_status as enum ('issued', 'redeemed', 'expired', 'canceled');
create type public.coupon_kind as enum ('percent', 'fixed', 'free_item', 'custom');
create type public.coupon_status as enum ('draft', 'active', 'paused', 'expired', 'archived');
create type public.campaign_channel as enum ('email', 'wallet', 'sms');
create type public.campaign_status as enum ('draft', 'scheduled', 'sending', 'sent', 'canceled', 'failed');
create type public.billing_period as enum ('monthly', 'semiannual', 'annual');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'expired', 'canceled');
create type public.invoice_status as enum ('draft', 'open', 'paid', 'void');
create type public.payment_method as enum ('cash', 'bank_transfer', 'card', 'cheque', 'other');
create type public.wallet_platform as enum ('apple', 'google');
create type public.integration_status as enum ('not_configured', 'configured', 'verified', 'error');
create type public.job_status as enum ('pending', 'running', 'done', 'failed');
