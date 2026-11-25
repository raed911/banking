-- Referrals: invitation only for brand-new customers, reward once on the friend's first real visit, tenant isolation.
do $$
declare
  ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); m1 uuid; m2 uuid; prog uuid; prog2 uuid; link text; link2 text;
  sami uuid; sami_card uuid; sami_code text; r jsonb; lina_card uuid; n int; bal int;
begin
  insert into auth.users (id, email, aud, role, raw_user_meta_data, raw_app_meta_data, created_at, updated_at) values
    (ua, 'rf-a-' || ua || '@test.vayro', 'authenticated', 'authenticated', '{}', '{}', now(), now()),
    (ub, 'rf-b-' || ub || '@test.vayro', 'authenticated', 'authenticated', '{}', '{}', now(), now());
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  m2 := public.create_merchant('Ref B', 'ref-b-' || substr(ub::text, 1, 8));
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  m1 := public.create_merchant('Ref A', 'ref-a-' || substr(ua::text, 1, 8));
  insert into public.loyalty_programs (merchant_id, name, type, status, stamps_required, cooldown_minutes, welcome_bonus, referral_reward)
  values (m1, 'Carte', 'stamps', 'active', 10, 0, 0, 1) returning id into prog;
  insert into public.loyalty_programs (merchant_id, name, type, status, stamps_required, cooldown_minutes, welcome_bonus)
  values (m1, 'Autre', 'stamps', 'active', 10, 0, 0) returning id into prog2;
  insert into public.enrollment_links (merchant_id, program_id) values (m1, prog) returning code into link;
  insert into public.enrollment_links (merchant_id, program_id) values (m1, prog2) returning code into link2;

  perform set_config('role', 'postgres', true);
  -- Sami signs up normally and gets a personal code
  r := public.enroll_customer(link, 'Sami', null, '+21621000001', null);
  assert (r ->> 'ok')::boolean and not (r ->> 'referred')::boolean, 'FAIL: plain enrolment ' || r;
  sami_card := (r ->> 'card_id')::uuid; sami := (r ->> 'customer_id')::uuid;
  select referral_code into sami_code from public.loyalty_cards where id = sami_card;
  assert sami_code ~ '^[A-Z2-9]{8}$', 'FAIL: referral code format';

  -- code of another program, or an unknown code: enrolment works, no referral
  r := public.enroll_customer(link2, 'Autre', null, '+21621000009', null, null, false, 'fr', sami_code);
  assert (r ->> 'ok')::boolean and not (r ->> 'referred')::boolean, 'FAIL: cross-program referral accepted';
  r := public.enroll_customer(link, 'Inconnu', null, '+21621000008', null, null, false, 'fr', 'ZZZZZZZZ');
  assert (r ->> 'ok')::boolean and not (r ->> 'referred')::boolean, 'FAIL: unknown code accepted';
  -- an existing customer of the merchant (Sami's own phone, other program) is not a referral
  r := public.enroll_customer(link2, 'Sami', null, '+21621000001', null, null, false, 'fr', sami_code);
  assert (r ->> 'ok')::boolean and not (r ->> 'referred')::boolean, 'FAIL: existing customer counted as referral';

  -- Lina joins with Sami's link → pending referral, no stamps yet
  r := public.enroll_customer(link, 'Lina', null, '+21621000002', null, null, false, 'fr', lower(sami_code));
  assert (r ->> 'ok')::boolean and (r ->> 'referred')::boolean, 'FAIL: referral not recorded ' || r;
  lina_card := (r ->> 'card_id')::uuid;
  assert (select status from public.referrals where referred_card_id = lina_card) = 'pending', 'FAIL: referral not pending';
  assert (select balance from public.loyalty_cards where id = sami_card) = 0, 'FAIL: referrer rewarded before the visit';
  assert exists (select 1 from public.notifications where merchant_id = m1 and type = 'customer.referred'), 'FAIL: merchant not notified';

  -- Lina's first visit (staff stamp) → +1 visit, then +1 each for the referral, exactly once
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  r := public.apply_loyalty_transaction(lina_card, 'earn', 1, 'ref-visit-0001');
  assert (r ->> 'ok')::boolean, 'FAIL: first visit ' || r;
  perform set_config('role', 'postgres', true);
  set constraints all immediate; -- run the deferred referral trigger now (normally at commit)
  set constraints all deferred;
  select balance into bal from public.loyalty_cards where id = lina_card;
  assert bal = 2, 'FAIL: friend balance should be 1 visit + 1 bonus, got ' || bal;
  select balance into bal from public.loyalty_cards where id = sami_card;
  assert bal = 1, 'FAIL: referrer bonus, got ' || bal;
  assert (select status from public.referrals where referred_card_id = lina_card) = 'completed', 'FAIL: referral not completed';
  assert (select count(*) from public.loyalty_transactions where source = 'referral' and card_id in (sami_card, lina_card)) = 2, 'FAIL: referral ledger lines';

  perform set_config('role', 'authenticated', true);
  r := public.apply_loyalty_transaction(lina_card, 'earn', 1, 'ref-visit-0002');
  perform set_config('role', 'postgres', true);
  set constraints all immediate; set constraints all deferred;
  select balance into bal from public.loyalty_cards where id = sami_card;
  assert bal = 1, 'FAIL: referrer rewarded twice';
  select balance into bal from public.loyalty_cards where id = lina_card;
  assert bal = 3, 'FAIL: second visit should only add the visit, got ' || bal;

  -- a disabled program accepts the sign-up but ignores the code
  update public.loyalty_programs set referral_enabled = false where id = prog;
  r := public.enroll_customer(link, 'Nour', null, '+21621000003', null, null, false, 'fr', sami_code);
  assert (r ->> 'ok')::boolean and not (r ->> 'referred')::boolean, 'FAIL: referral accepted while disabled';

  -- isolation: owner B cannot read A's referrals; clients cannot call enroll_customer
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  select count(*) into n from public.referrals where merchant_id = m1;
  assert n = 0, 'FAIL: B reads A referrals';
  begin
    perform public.enroll_customer(link, 'x', null, '+21621000004', null, null, false, 'fr', sami_code);
    raise exception 'FAIL: enroll_customer callable by clients';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  select count(*) into n from public.referrals where merchant_id = m1;
  assert n = 1, 'FAIL: A cannot read its referrals, got ' || n;
  raise exception 'ALL_TESTS_PASSED';
end $$;
