-- VAYRO · 0004 · Campaigns, notifications, integrations, wallet passes, billing, security, ops

-- ───────────── Engagement ─────────────
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  channel public.campaign_channel not null,
  status public.campaign_status not null default 'draft',
  program_id uuid references public.loyalty_programs (id) on delete set null,
  segment jsonb not null default '{"type":"all"}'::jsonb,
  subject text,
  content jsonb not null default '{}'::jsonb,
  coupon_id uuid references public.coupons (id) on delete set null,
  scheduled_at timestamptz,
  sent_at timestamptz,
  stats jsonb not null default '{"targeted":0,"sent":0,"failed":0,"opened":0}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger campaigns_touch before update on public.campaigns for each row execute function private.touch_updated_at();
create index campaigns_merchant_idx on public.campaigns (merchant_id, created_at desc);
create index campaigns_scheduled_idx on public.campaigns (scheduled_at) where status = 'scheduled';

create table public.campaign_deliveries (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped', 'opened')),
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (campaign_id, customer_id)
);
create index campaign_deliveries_merchant_idx on public.campaign_deliveries (merchant_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references public.merchants (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade, -- null = all members of merchant
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_merchant_idx on public.notifications (merchant_id, created_at desc);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ───────────── Integrations (secrets encrypted by the app, never readable by clients) ─────────────
create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references public.merchants (id) on delete cascade, -- null = platform-level
  provider text not null check (provider in ('apple_wallet', 'google_wallet', 'resend', 'sms', 'payment')),
  config jsonb not null default '{}'::jsonb,   -- non-secret values (team id, issuer id, emails…)
  secret_ciphertext text,                       -- AES-256-GCM envelope, decrypted server-side only
  secret_hints jsonb not null default '{}'::jsonb, -- e.g. {"privateKey":"…a1f3","certificateExpiresAt":"…"}
  status public.integration_status not null default 'not_configured',
  last_verified_at timestamptz,
  last_error text,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger integrations_touch before update on public.integrations for each row execute function private.touch_updated_at();
create unique index integrations_scope_uniq on public.integrations (coalesce(merchant_id, '00000000-0000-0000-0000-000000000000'::uuid), provider);

create table public.wallet_passes (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  card_id uuid not null references public.loyalty_cards (id) on delete cascade,
  platform public.wallet_platform not null,
  serial_number text not null,
  pass_type_identifier text,          -- apple
  auth_token_hash text,               -- apple web service auth token (sha256)
  google_object_id text,              -- google
  google_class_id text,
  version int not null default 1,
  installed_at timestamptz,
  removed_at timestamptz,
  last_updated_at timestamptz not null default now(),
  last_pushed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (platform, serial_number),
  unique (card_id, platform)
);
create index wallet_passes_merchant_idx on public.wallet_passes (merchant_id);

create table public.apple_device_registrations (
  id uuid primary key default gen_random_uuid(),
  pass_id uuid not null references public.wallet_passes (id) on delete cascade,
  device_library_identifier text not null,
  push_token text not null,
  created_at timestamptz not null default now(),
  unique (pass_id, device_library_identifier)
);
create index apple_device_reg_device_idx on public.apple_device_registrations (device_library_identifier);

-- ───────────── Billing ─────────────
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z0-9_]{2,40}$'),
  name text not null,
  description text,
  features jsonb not null default '[]'::jsonb,
  limits jsonb not null default '{}'::jsonb,     -- {"programs":10,"employees":25,"customers":null}
  trial_days int not null default 14 check (trial_days >= 0),
  is_public boolean not null default true,
  is_active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger plans_touch before update on public.plans for each row execute function private.touch_updated_at();

create table public.plan_prices (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  period public.billing_period not null,
  interval_months int not null check (interval_months in (1, 6, 12)),
  amount_millimes bigint not null check (amount_millimes >= 0), -- price per location for the whole period
  currency text not null default 'TND',
  label text,
  badge text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (plan_id, period, currency)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null unique references public.merchants (id) on delete cascade,
  plan_id uuid not null references public.plans (id),
  price_id uuid references public.plan_prices (id),
  status public.subscription_status not null default 'trialing',
  quantity int not null default 1 check (quantity between 1 and 1000), -- number of points of sale
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  provider text not null default 'manual',
  provider_ref text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger subscriptions_touch before update on public.subscriptions for each row execute function private.touch_updated_at();
create index subscriptions_status_idx on public.subscriptions (status, current_period_end);

create sequence public.invoice_number_seq;
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  number text not null unique,
  status public.invoice_status not null default 'open',
  currency text not null default 'TND',
  subtotal_millimes bigint not null check (subtotal_millimes >= 0),
  tax_millimes bigint not null default 0,
  total_millimes bigint not null check (total_millimes >= 0),
  period_start timestamptz,
  period_end timestamptz,
  line_items jsonb not null default '[]'::jsonb,
  issued_at timestamptz not null default now(),
  due_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index invoices_merchant_idx on public.invoices (merchant_id, issued_at desc);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  invoice_id uuid references public.invoices (id) on delete set null,
  amount_millimes bigint not null check (amount_millimes > 0),
  currency text not null default 'TND',
  method public.payment_method not null,
  provider text not null default 'manual',
  reference text,            -- receipt number / transfer reference
  received_by uuid references auth.users (id) on delete set null,
  received_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);
create index payments_merchant_idx on public.payments (merchant_id, received_at desc);
create index payments_received_idx on public.payments (received_at desc);

create table public.payment_provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);

-- ───────────── Security & operations ─────────────
create table public.fraud_signals (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  card_id uuid references public.loyalty_cards (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  rule text not null,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high')),
  details jsonb not null default '{}'::jsonb,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index fraud_signals_merchant_idx on public.fraud_signals (merchant_id, created_at desc);

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  name text not null,
  prefix text not null,
  key_hash text not null unique,
  scopes text[] not null default '{}',
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index api_keys_merchant_idx on public.api_keys (merchant_id);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  merchant_id uuid references public.merchants (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  actor_type text not null default 'user' check (actor_type in ('user', 'admin', 'system', 'api')),
  action text not null,
  entity_type text,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  ip inet,
  created_at timestamptz not null default now()
);
create index audit_logs_merchant_idx on public.audit_logs (merchant_id, created_at desc);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

create table public.system_logs (
  id bigint generated always as identity primary key,
  level text not null check (level in ('debug', 'info', 'warn', 'error')),
  source text not null,
  message text not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index system_logs_created_idx on public.system_logs (created_at desc);
create index system_logs_level_idx on public.system_logs (level, created_at desc);

create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create table private.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (key, window_start)
);

create table private.job_queue (
  id bigint generated always as identity primary key,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text,
  status public.job_status not null default 'pending',
  run_at timestamptz not null default now(),
  attempts int not null default 0,
  max_attempts int not null default 5,
  last_error text,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index job_queue_pending_idx on private.job_queue (run_at) where status = 'pending';
create unique index job_queue_dedupe_idx on private.job_queue (kind, dedupe_key) where status = 'pending' and dedupe_key is not null;
