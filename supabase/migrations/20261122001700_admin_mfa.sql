-- VAYRO · 0017 · Super admin powers require a second factor (AAL2) at the database level.
-- is_platform_admin() now returns true only for an admin session verified with MFA; every admin RLS policy
-- and admin function inherits this. is_platform_admin_account() is for UI routing only (grants nothing).
create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_admins where user_id = (select auth.uid()))
     and coalesce((select auth.jwt()) ->> 'aal', 'aal1') = 'aal2';
$$;

create or replace function public.is_platform_admin_account()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_platform_admin_account() from public, anon;
grant execute on function public.is_platform_admin_account() to authenticated;
