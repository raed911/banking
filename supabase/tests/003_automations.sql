-- Automations: inactivity rule, consent, cooldown, tenant isolation.
do $$
declare ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); m1 uuid; m2 uuid; c_old uuid; c_new uuid; c_noconsent uuid; aid uuid; r jsonb; n int;
begin
  insert into auth.users (id, email, aud, role, raw_user_meta_data, raw_app_meta_data, created_at, updated_at) values
    (ua, 'au-a-' || ua || '@test.vayro', 'authenticated', 'authenticated', '{}', '{}', now(), now()),
    (ub, 'au-b-' || ub || '@test.vayro', 'authenticated', 'authenticated', '{}', '{}', now(), now());
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  m2 := public.create_merchant('Auto B', 'auto-b-' || substr(ub::text, 1, 8));
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  m1 := public.create_merchant('Auto A', 'auto-a-' || substr(ua::text, 1, 8));
  insert into public.customers (merchant_id, first_name, phone, marketing_consent) values (m1, 'Ancien', '+21620111111', true) returning id into c_old;
  insert into public.customers (merchant_id, first_name, phone, marketing_consent) values (m1, 'Récent', '+21620222222', true) returning id into c_new;
  insert into public.customers (merchant_id, first_name, phone, marketing_consent) values (m1, 'SansAccord', '+21620333333', false) returning id into c_noconsent;
  insert into public.automations (merchant_id, kind, enabled, channel, inactive_days, cooldown_days, message)
  values (m1, 'winback', true, 'card', 30, 30, 'Vous nous manquez ! -50% 💚') returning id into aid;

  -- other tenant cannot see or create automations for merchant 1
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  assert (select count(*) from public.automations where merchant_id = m1) = 0, 'FAIL: B sees A automations';
  begin
    insert into public.automations (merchant_id, kind, message) values (m1, 'birthday', 'hack');
    raise exception 'FAIL: B created automation for A';
  exception when insufficient_privilege then null; end;

  perform set_config('role', 'postgres', true);
  update public.customers set created_at = now() - interval '45 days', last_visit_at = now() - interval '40 days' where id in (c_old, c_noconsent);
  update public.customers set last_visit_at = now() - interval '2 days' where id = c_new;

  r := private.run_automations();
  select count(*) into n from public.campaign_deliveries d join public.campaigns c on c.id = d.campaign_id where c.automation_id = aid;
  assert n = 1, 'FAIL: expected only the inactive consenting customer, got ' || n;
  assert exists (select 1 from public.campaign_deliveries d join public.campaigns c on c.id = d.campaign_id where c.automation_id = aid and d.customer_id = c_old), 'FAIL: wrong recipient';

  -- same day: not re-run; next day: cooldown prevents a second message to the same customer
  r := private.run_automations();
  assert (r ->> 'automations')::int = 0, 'FAIL: ran twice the same day';
  update public.automations set last_run_at = now() - interval '1 day' where id = aid;
  r := private.run_automations();
  select count(*) into n from public.campaign_deliveries d join public.campaigns c on c.id = d.campaign_id where c.automation_id = aid;
  assert n = 1, 'FAIL: cooldown not respected, deliveries = ' || n;
  raise exception 'ALL_TESTS_PASSED';
end $$;
