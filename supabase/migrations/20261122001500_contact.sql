-- VAYRO · 0015 · Contact requests from the public website (written by the server, read by platform admins)
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  email extensions.citext not null,
  phone text,
  business text,
  message text not null check (char_length(message) between 5 and 3000),
  locale text,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
create index contact_messages_created_idx on public.contact_messages (created_at desc);
alter table public.contact_messages enable row level security;
alter table public.contact_messages force row level security;
grant select, update (handled_at) on public.contact_messages to authenticated;
create policy "platform admins read contact" on public.contact_messages for select to authenticated using ((select public.is_platform_admin()));
create policy "platform admins handle contact" on public.contact_messages for update to authenticated using ((select public.is_platform_admin()));
grant all on public.contact_messages to service_role;
