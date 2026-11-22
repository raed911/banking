-- VAYRO · 0013 · Team: invitations (token hashed), acceptance, team listing with emails
create or replace function public.create_invitation(p_merchant_id uuid, p_email text, p_role_id uuid, p_token_hash text, p_location_ids uuid[] default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare inv_id uuid; r public.roles;
begin
  if not public.has_merchant_permission(p_merchant_id, 'employees.manage') then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into r from public.roles where id = p_role_id and merchant_id = p_merchant_id;
  if not found or r.key = 'owner' then raise exception 'invalid_role' using errcode = 'P0001'; end if;
  if length(p_token_hash) <> 64 then raise exception 'invalid_token' using errcode = 'P0001'; end if;
  if exists (select 1 from public.merchant_members m join auth.users u on u.id = m.user_id where m.merchant_id = p_merchant_id and lower(u.email) = lower(p_email)) then
    raise exception 'already_member' using errcode = 'P0001';
  end if;
  update public.invitations set revoked_at = now() where merchant_id = p_merchant_id and lower(email::text) = lower(p_email) and accepted_at is null and revoked_at is null;
  insert into public.invitations (merchant_id, email, role_id, location_ids, token_hash, invited_by)
  values (p_merchant_id, lower(trim(p_email)), p_role_id, p_location_ids, p_token_hash, auth.uid()) returning id into inv_id;
  perform private.audit(p_merchant_id, 'team.invited', 'invitation', inv_id::text, jsonb_build_object('email', lower(p_email), 'role', r.key));
  return inv_id;
end $$;

-- Invitation preview for the accept page (by token hash; reveals only merchant name, role and masked email)
create or replace function public.invitation_preview(p_token_hash text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('merchant', m.name, 'role', r.name, 'email', i.email, 'expired', i.expires_at < now(), 'used', i.accepted_at is not null or i.revoked_at is not null)
  from public.invitations i join public.merchants m on m.id = i.merchant_id join public.roles r on r.id = i.role_id
  where i.token_hash = p_token_hash;
$$;

create or replace function public.accept_invitation(p_token_hash text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare inv public.invitations; uemail text;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into inv from public.invitations where token_hash = p_token_hash for update;
  if not found or inv.revoked_at is not null or inv.accepted_at is not null then raise exception 'invitation_invalid' using errcode = 'P0001'; end if;
  if inv.expires_at < now() then raise exception 'invitation_expired' using errcode = 'P0001'; end if;
  select email into uemail from auth.users where id = auth.uid();
  if lower(uemail) <> lower(inv.email::text) then raise exception 'email_mismatch' using errcode = 'P0001'; end if;
  insert into public.merchant_members (merchant_id, user_id, role_id, location_ids, status)
  values (inv.merchant_id, auth.uid(), inv.role_id, inv.location_ids, 'active')
  on conflict (merchant_id, user_id) do update set role_id = excluded.role_id, status = 'active';
  update public.invitations set accepted_at = now() where id = inv.id;
  update public.profiles set last_merchant_id = inv.merchant_id where id = auth.uid();
  insert into public.notifications (merchant_id, type, title, body, link) values (inv.merchant_id, 'team.joined', 'Nouveau membre', uemail || ' a rejoint l''équipe', '/dashboard/employees');
  perform private.audit(inv.merchant_id, 'team.joined', 'member', auth.uid()::text, jsonb_build_object('email', uemail));
  return inv.merchant_id;
end $$;

create or replace function public.merchant_team(p_merchant_id uuid)
returns table (member_id uuid, user_id uuid, email text, full_name text, role_id uuid, role_key text, role_name text, status public.member_status, last_active_at timestamptz, created_at timestamptz, location_ids uuid[])
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_merchant_member(p_merchant_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
  select m.id, m.user_id, u.email::text, p.full_name, r.id, r.key, r.name, m.status, m.last_active_at, m.created_at, m.location_ids
  from public.merchant_members m join auth.users u on u.id = m.user_id join public.roles r on r.id = m.role_id left join public.profiles p on p.id = m.user_id
  where m.merchant_id = p_merchant_id order by m.created_at;
end $$;

revoke all on function public.create_invitation(uuid, text, uuid, text, uuid[]), public.invitation_preview(text), public.accept_invitation(text), public.merchant_team(uuid) from public, anon;
grant execute on function public.create_invitation(uuid, text, uuid, text, uuid[]), public.invitation_preview(text), public.accept_invitation(text), public.merchant_team(uuid) to authenticated;
grant execute on function public.invitation_preview(text) to service_role;
