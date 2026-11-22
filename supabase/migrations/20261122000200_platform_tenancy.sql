-- VAYRO · 0002 · Platform users, admins, merchants (tenants), roles, members, locations
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  avatar_path text,
  locale text not null default 'fr' check (locale in ('fr', 'ar', 'en')),
  last_merchant_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_touch before update on public.profiles for each row execute function private.touch_updated_at();

create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'admin' check (role in ('owner', 'admin', 'support')),
  created_at timestamptz not null default now()
);

create table public.merchants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$'),
  legal_name text,
  tax_id text,
  email extensions.citext,
  phone text,
  website text,
  address text,
  city text,
  country text not null default 'TN',
  currency text not null default 'TND',
  timezone text not null default 'Africa/Tunis',
  locale text not null default 'fr' check (locale in ('fr', 'ar', 'en')),
  industry text,
  logo_path text,
  brand_color text not null default '#101828' check (brand_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text not null default '#C6F36B' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  status public.merchant_status not null default 'active',
  suspended_reason text,
  suspended_at timestamptz,
  settings jsonb not null default '{}'::jsonb,
  onboarding_completed_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger merchants_touch before update on public.merchants for each row execute function private.touch_updated_at();
create index merchants_status_idx on public.merchants (status);
create index merchants_created_idx on public.merchants (created_at desc);

alter table public.profiles add constraint profiles_last_merchant_fk foreign key (last_merchant_id) references public.merchants (id) on delete set null;

-- Roles: '*' = all permissions. System roles are created per merchant and cannot be deleted.
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  key text not null check (key ~ '^[a-z0-9_]{2,40}$'),
  name text not null,
  description text,
  permissions text[] not null default '{}',
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, key)
);
create trigger roles_touch before update on public.roles for each row execute function private.touch_updated_at();

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  address text,
  city text,
  phone text,
  latitude double precision,
  longitude double precision,
  nfc_reader_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger locations_touch before update on public.locations for each row execute function private.touch_updated_at();
create index locations_merchant_idx on public.locations (merchant_id);

create table public.merchant_members (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete restrict,
  status public.member_status not null default 'active',
  title text,
  location_ids uuid[], -- null = all locations
  pin_hash text,       -- optional staff PIN for shared scanner devices
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, user_id)
);
create trigger merchant_members_touch before update on public.merchant_members for each row execute function private.touch_updated_at();
create index merchant_members_user_idx on public.merchant_members (user_id) where status = 'active';
create index merchant_members_role_idx on public.merchant_members (role_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  email extensions.citext not null,
  role_id uuid not null references public.roles (id) on delete cascade,
  location_ids uuid[],
  token_hash text not null unique,
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index invitations_merchant_idx on public.invitations (merchant_id);
create unique index invitations_pending_uniq on public.invitations (merchant_id, email) where accepted_at is null and revoked_at is null;

-- ───────────── Authorization helpers (SECURITY DEFINER, used by RLS) ─────────────
create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_admins where user_id = (select auth.uid()));
$$;

create or replace function public.is_merchant_member(mid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.merchant_members m
    join public.merchants t on t.id = m.merchant_id
    where m.merchant_id = mid and m.user_id = (select auth.uid()) and m.status = 'active' and t.status <> 'closed'
  );
$$;

create or replace function public.has_merchant_permission(mid uuid, perm text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.merchant_members m
    join public.roles r on r.id = m.role_id
    join public.merchants t on t.id = m.merchant_id
    where m.merchant_id = mid and m.user_id = (select auth.uid()) and m.status = 'active'
      and t.status = 'active'
      and ('*' = any (r.permissions) or perm = any (r.permissions))
  );
$$;

create or replace function public.my_permissions(mid uuid)
returns text[] language sql stable security definer set search_path = '' as $$
  select coalesce((
    select r.permissions from public.merchant_members m join public.roles r on r.id = m.role_id
    where m.merchant_id = mid and m.user_id = (select auth.uid()) and m.status = 'active'
  ), '{}');
$$;

-- New auth user → profile
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, locale)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''), coalesce(nullif(new.raw_user_meta_data ->> 'locale', ''), 'fr'))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();
