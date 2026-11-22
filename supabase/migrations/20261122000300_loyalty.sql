-- VAYRO · 0003 · Loyalty: programs, card designs, customers, cards, ledger, rewards, coupons, enrolment
create table public.loyalty_programs (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  description text,
  type public.program_type not null,
  status public.program_status not null default 'draft',
  -- stamps/visits: number needed for the main reward; points: earn rate
  stamps_required int check (stamps_required between 1 and 50),
  points_per_unit numeric(10, 3) check (points_per_unit > 0),     -- points per 1 TND spent
  welcome_bonus int not null default 0 check (welcome_bonus >= 0),
  reward_title text,
  -- anti-fraud & rules
  cooldown_minutes int not null default 5 check (cooldown_minutes between 0 and 1440),
  max_earn_per_day int not null default 3 check (max_earn_per_day between 1 and 100000),
  max_earn_per_transaction int not null default 1 check (max_earn_per_transaction between 1 and 100000),
  points_expire_days int check (points_expire_days > 0),
  terms text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint program_rules_ck check (
    (type in ('stamps', 'visits') and stamps_required is not null) or (type = 'points' and points_per_unit is not null)
  )
);
create trigger loyalty_programs_touch before update on public.loyalty_programs for each row execute function private.touch_updated_at();
create index loyalty_programs_merchant_idx on public.loyalty_programs (merchant_id, status);

create table public.card_designs (
  program_id uuid primary key references public.loyalty_programs (id) on delete cascade,
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  background_color text not null default '#101828' check (background_color ~ '^#[0-9A-Fa-f]{6}$'),
  foreground_color text not null default '#FFFFFF' check (foreground_color ~ '^#[0-9A-Fa-f]{6}$'),
  label_color text not null default '#C6F36B' check (label_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text not null default '#C6F36B' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  logo_path text,
  icon_path text,
  strip_path text,
  stamp_icon text not null default 'coffee',
  logo_text text,
  header_label text,
  secondary_fields jsonb not null default '[]'::jsonb,
  back_fields jsonb not null default '[]'::jsonb,
  barcode_format text not null default 'qr' check (barcode_format in ('qr', 'aztec', 'pdf417', 'code128')),
  updated_at timestamptz not null default now()
);
create trigger card_designs_touch before update on public.card_designs for each row execute function private.touch_updated_at();
create index card_designs_merchant_idx on public.card_designs (merchant_id);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 60),
  last_name text check (char_length(last_name) <= 60),
  email extensions.citext,
  phone text check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  birthday date,
  gender text check (gender in ('female', 'male', 'other')),
  locale text not null default 'fr',
  marketing_consent boolean not null default false,
  consent_at timestamptz,
  tags text[] not null default '{}',
  notes text,
  source text not null default 'dashboard' check (source in ('dashboard', 'enrollment', 'import', 'api', 'scanner')),
  enrolled_location_id uuid references public.locations (id) on delete set null,
  last_visit_at timestamptz,
  total_visits int not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger customers_touch before update on public.customers for each row execute function private.touch_updated_at();
create unique index customers_phone_uniq on public.customers (merchant_id, phone) where phone is not null and deleted_at is null;
create unique index customers_email_uniq on public.customers (merchant_id, email) where email is not null and deleted_at is null;
create index customers_merchant_created_idx on public.customers (merchant_id, created_at desc) where deleted_at is null;
create index customers_merchant_last_visit_idx on public.customers (merchant_id, last_visit_at desc nulls last);
create index customers_tags_idx on public.customers using gin (tags);

create table public.loyalty_cards (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  program_id uuid not null references public.loyalty_programs (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  serial text not null unique default private.random_code(10),
  public_token text not null unique default private.random_token(24),
  balance int not null default 0 check (balance >= 0),
  lifetime_earned int not null default 0,
  lifetime_redeemed int not null default 0,
  rewards_earned int not null default 0,
  status public.card_status not null default 'active',
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, customer_id)
);
create trigger loyalty_cards_touch before update on public.loyalty_cards for each row execute function private.touch_updated_at();
create index loyalty_cards_merchant_idx on public.loyalty_cards (merchant_id, created_at desc);
create index loyalty_cards_customer_idx on public.loyalty_cards (customer_id);

-- Append-only ledger. Balances change ONLY through public.apply_loyalty_transaction().
create table public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  card_id uuid not null references public.loyalty_cards (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  program_id uuid not null references public.loyalty_programs (id) on delete cascade,
  kind public.ledger_kind not null,
  amount int not null,               -- signed delta applied to balance
  balance_after int not null,
  purchase_amount_millimes bigint,   -- optional receipt amount (points programs)
  reward_id uuid,
  location_id uuid references public.locations (id) on delete set null,
  performed_by uuid references auth.users (id) on delete set null,
  source text not null default 'dashboard' check (source in ('dashboard', 'scanner', 'enrollment', 'api', 'system', 'nfc')),
  idempotency_key text not null,
  reversed_transaction_id uuid references public.loyalty_transactions (id),
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (merchant_id, idempotency_key)
);
create index loyalty_tx_merchant_created_idx on public.loyalty_transactions (merchant_id, created_at desc);
create index loyalty_tx_card_created_idx on public.loyalty_transactions (card_id, created_at desc);
create index loyalty_tx_performed_by_idx on public.loyalty_transactions (merchant_id, performed_by, created_at desc);

create or replace function private.forbid_ledger_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'loyalty_transactions is append-only' using errcode = '42501';
end $$;
create trigger loyalty_tx_no_update before update or delete on public.loyalty_transactions
  for each row when (pg_trigger_depth() = 0) execute function private.forbid_ledger_mutation();

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  program_id uuid not null references public.loyalty_programs (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  description text,
  cost int not null check (cost > 0),
  image_path text,
  stock int check (stock >= 0),
  valid_days int check (valid_days > 0),   -- voucher validity once issued
  is_active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger rewards_touch before update on public.rewards for each row execute function private.touch_updated_at();
create index rewards_program_idx on public.rewards (program_id, is_active);
create index rewards_merchant_idx on public.rewards (merchant_id);

alter table public.loyalty_transactions add constraint loyalty_tx_reward_fk foreign key (reward_id) references public.rewards (id) on delete set null;

create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  reward_id uuid not null references public.rewards (id) on delete cascade,
  card_id uuid not null references public.loyalty_cards (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  transaction_id uuid references public.loyalty_transactions (id),
  code text not null unique default private.random_code(8),
  status public.redemption_status not null default 'redeemed',
  expires_at timestamptz,
  redeemed_at timestamptz,
  redeemed_by uuid references auth.users (id) on delete set null,
  location_id uuid references public.locations (id) on delete set null,
  created_at timestamptz not null default now()
);
create index reward_redemptions_merchant_idx on public.reward_redemptions (merchant_id, created_at desc);
create index reward_redemptions_card_idx on public.reward_redemptions (card_id);

create table public.enrollment_links (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  program_id uuid not null references public.loyalty_programs (id) on delete cascade,
  location_id uuid references public.locations (id) on delete set null,
  name text not null default 'Lien principal',
  code text not null unique default lower(private.random_code(8)),
  is_active boolean not null default true,
  require_phone boolean not null default true,
  require_email boolean not null default false,
  collect_birthday boolean not null default false,
  uses int not null default 0,
  max_uses int check (max_uses > 0),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger enrollment_links_touch before update on public.enrollment_links for each row execute function private.touch_updated_at();
create index enrollment_links_merchant_idx on public.enrollment_links (merchant_id);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  program_id uuid references public.loyalty_programs (id) on delete set null,
  name text not null check (char_length(name) between 2 and 80),
  description text,
  code text not null check (code ~ '^[A-Z0-9-]{3,24}$'),
  kind public.coupon_kind not null,
  value numeric(12, 3),
  status public.coupon_status not null default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  max_redemptions int check (max_redemptions > 0),
  per_customer_limit int not null default 1 check (per_customer_limit > 0),
  redemptions_count int not null default 0,
  min_purchase_millimes bigint,
  terms text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, code),
  constraint coupon_value_ck check ((kind in ('percent', 'fixed') and value > 0) or kind in ('free_item', 'custom')),
  constraint coupon_percent_ck check (kind <> 'percent' or value <= 100),
  constraint coupon_dates_ck check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create trigger coupons_touch before update on public.coupons for each row execute function private.touch_updated_at();
create index coupons_merchant_idx on public.coupons (merchant_id, status);

create table public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  coupon_id uuid not null references public.coupons (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  card_id uuid references public.loyalty_cards (id) on delete set null,
  location_id uuid references public.locations (id) on delete set null,
  redeemed_by uuid references auth.users (id) on delete set null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (merchant_id, idempotency_key)
);
create index coupon_redemptions_coupon_idx on public.coupon_redemptions (coupon_id, customer_id);
create index coupon_redemptions_merchant_idx on public.coupon_redemptions (merchant_id, created_at desc);
