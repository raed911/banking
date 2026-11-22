-- VAYRO database test suite. Runs inside a transaction and always rolls back:
-- the block ends by raising 'ALL_TESTS_PASSED', any failed assertion raises 'FAIL: …'.
do $$
declare
  ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); uc uuid := gen_random_uuid(); uadmin uuid := gen_random_uuid();
  m1 uuid; m2 uuid; prog uuid; cust uuid; card uuid; rw uuid; link_code text; r jsonb; n int; ok boolean;
  cashier_role uuid; price uuid; sub public.subscriptions;
begin
  insert into auth.users (id, email, aud, role, raw_user_meta_data, raw_app_meta_data, created_at, updated_at) values
    (ua, 'a-' || ua || '@test.vayro', 'authenticated', 'authenticated', '{"full_name":"Owner A"}', '{}', now(), now()),
    (ub, 'b-' || ub || '@test.vayro', 'authenticated', 'authenticated', '{"full_name":"Owner B"}', '{}', now(), now()),
    (uc, 'c-' || uc || '@test.vayro', 'authenticated', 'authenticated', '{"full_name":"Cashier C"}', '{}', now(), now()),
    (uadmin, 'x-' || uadmin || '@test.vayro', 'authenticated', 'authenticated', '{}', '{}', now(), now());
  assert (select count(*) from public.profiles where id in (ua, ub, uc)) = 3, 'FAIL: profiles not auto-created';
  insert into public.platform_admins (user_id, role) values (uadmin, 'owner');

  -- ── owner A creates merchant 1
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  m1 := public.create_merchant('Café Test A', 'test-cafe-a-' || substr(ua::text, 1, 8));
  assert (select status from public.subscriptions where merchant_id = m1) = 'trialing', 'FAIL: trial not started';
  assert (select count(*) from public.roles where merchant_id = m1) = 4, 'FAIL: system roles missing';
  assert (select count(*) from public.locations where merchant_id = m1) = 1, 'FAIL: default location missing';

  insert into public.loyalty_programs (merchant_id, name, type, status, stamps_required, cooldown_minutes, max_earn_per_day, welcome_bonus)
  values (m1, 'Carte café', 'stamps', 'active', 10, 5, 3, 1) returning id into prog;
  insert into public.customers (merchant_id, first_name, phone) values (m1, 'Sami', '+21620000001') returning id into cust;
  insert into public.loyalty_cards (merchant_id, program_id, customer_id) values (m1, prog, cust) returning id into card;

  -- clients can never write balances or the ledger directly
  begin
    update public.loyalty_cards set balance = 100 where id = card;
    raise exception 'FAIL: balance was writable';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.loyalty_transactions (merchant_id, card_id, customer_id, program_id, kind, amount, balance_after, idempotency_key)
    values (m1, card, cust, prog, 'earn', 50, 50, 'hack-1');
    raise exception 'FAIL: ledger was writable';
  exception when insufficient_privilege then null; end;
  begin
    perform public.enroll_customer('x', 'x', null, '+21620000009', null);
    raise exception 'FAIL: enroll_customer callable by clients';
  exception when insufficient_privilege then null; end;

  -- ledger: earn, idempotency, cooldown
  r := public.apply_loyalty_transaction(card, 'earn', 1, 'test-earn-0001');
  assert (r ->> 'ok')::boolean and (r ->> 'balance')::int = 1, 'FAIL: earn ' || r::text;
  r := public.apply_loyalty_transaction(card, 'earn', 1, 'test-earn-0001');
  assert (r ->> 'duplicate')::boolean and (select balance from public.loyalty_cards where id = card) = 1, 'FAIL: idempotency ' || r::text;
  r := public.apply_loyalty_transaction(card, 'earn', 1, 'test-earn-0002');
  assert r ->> 'error' = 'cooldown', 'FAIL: cooldown ' || r::text;
  r := public.apply_loyalty_transaction(card, 'earn', 5, 'test-earn-0003');
  assert r ->> 'error' = 'max_per_transaction', 'FAIL: max per tx ' || r::text;
  update public.loyalty_programs set cooldown_minutes = 0 where id = prog;
  r := public.apply_loyalty_transaction(card, 'earn', 1, 'test-earn-0004');
  r := public.apply_loyalty_transaction(card, 'earn', 1, 'test-earn-0005');
  assert (r ->> 'balance')::int = 3, 'FAIL: balance after 3 earns ' || r::text;
  r := public.apply_loyalty_transaction(card, 'earn', 1, 'test-earn-0006');
  assert r ->> 'error' = 'daily_limit', 'FAIL: daily limit ' || r::text;
  assert (select count(*) from public.fraud_signals where card_id = card) >= 3, 'FAIL: fraud signals not recorded';

  -- adjust requires a note; reverse works
  r := public.apply_loyalty_transaction(card, 'adjust', 2, 'test-adj-0001', null, 'dashboard', null, null);
  assert r ->> 'error' = 'note_required', 'FAIL: adjust without note ' || r::text;
  r := public.apply_loyalty_transaction(card, 'adjust', 2, 'test-adj-0002', null, 'dashboard', null, 'Geste commercial');
  assert (r ->> 'balance')::int = 5, 'FAIL: adjust ' || r::text;
  r := public.reverse_transaction((r ->> 'transaction_id')::uuid, 'Erreur de saisie');
  assert (r ->> 'balance')::int = 3, 'FAIL: reverse ' || r::text;

  -- rewards
  insert into public.rewards (merchant_id, program_id, name, cost, stock) values (m1, prog, 'Café offert', 3, 1) returning id into rw;
  r := public.redeem_reward(card, rw, 'test-redeem-0001');
  assert (r ->> 'ok')::boolean and (r ->> 'balance')::int = 0 and r ? 'redemption_code', 'FAIL: redeem ' || r::text;
  r := public.redeem_reward(card, rw, 'test-redeem-0002');
  assert r ->> 'error' in ('out_of_stock', 'insufficient_balance'), 'FAIL: redeem guard ' || r::text;

  -- coupons
  insert into public.coupons (merchant_id, name, code, kind, value, status, per_customer_limit) values (m1, 'Bienvenue', 'WELCOME10', 'percent', 10, 'active', 1);
  r := public.redeem_coupon(m1, 'welcome10', card, 'test-coupon-0001');
  assert (r ->> 'ok')::boolean, 'FAIL: coupon ' || r::text;
  r := public.redeem_coupon(m1, 'WELCOME10', card, 'test-coupon-0002');
  assert r ->> 'error' = 'coupon_already_used', 'FAIL: coupon reuse ' || r::text;

  -- enrolment link (created by owner)
  insert into public.enrollment_links (merchant_id, program_id) values (m1, prog) returning code into link_code;

  -- privilege escalation attempts by the owner
  begin
    update public.merchants set status = 'active', slug = 'stolen' where id = m1;
    raise exception 'FAIL: merchant status/slug writable';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.roles (merchant_id, key, name, permissions) values (m1, 'god', 'God', array['*']);
    raise exception 'FAIL: wildcard custom role allowed';
  exception when insufficient_privilege then null; end;

  -- ── owner B: strict tenant isolation
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  m2 := public.create_merchant('Boutique B', 'test-shop-b-' || substr(ub::text, 1, 8));
  assert (select count(*) from public.customers where merchant_id = m1) = 0, 'FAIL: B sees A customers';
  assert (select count(*) from public.loyalty_cards where merchant_id = m1) = 0, 'FAIL: B sees A cards';
  assert (select count(*) from public.loyalty_transactions where merchant_id = m1) = 0, 'FAIL: B sees A ledger';
  assert (select count(*) from public.merchants) = 1, 'FAIL: B sees other merchants';
  assert (select count(*) from public.subscriptions) = 1, 'FAIL: B sees other subscriptions';
  begin
    insert into public.customers (merchant_id, first_name) values (m1, 'Intrus');
    raise exception 'FAIL: B inserted into A';
  exception when insufficient_privilege then null; end;
  update public.merchants set name = 'Hacked' where id = m1;
  r := public.apply_loyalty_transaction(card, 'earn', 1, 'test-cross-0001');
  assert r ->> 'error' = 'forbidden', 'FAIL: B stamped A card ' || r::text;
  begin
    perform public.admin_record_payment(m2, (select id from public.plan_prices limit 1), 1, 99000, 'cash');
    raise exception 'FAIL: merchant recorded own payment';
  exception when insufficient_privilege then null; end;

  -- ── cashier C in merchant 1
  perform set_config('role', 'postgres', true);
  assert (select name from public.merchants where id = m1) = 'Café Test A', 'FAIL: B renamed A';
  select id into cashier_role from public.roles where merchant_id = m1 and key = 'cashier';
  insert into public.merchant_members (merchant_id, user_id, role_id) values (m1, uc, cashier_role);
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role', 'authenticated')::text, true);
  r := public.apply_loyalty_transaction(card, 'adjust', 5, 'test-c-adj-0001', null, 'dashboard', null, 'Je me fais plaisir');
  assert r ->> 'error' = 'forbidden', 'FAIL: cashier adjusted ' || r::text;
  assert (select count(*) from public.invoices) = 0, 'FAIL: cashier sees invoices';
  assert (select count(*) from public.campaigns) = 0, 'FAIL: cashier sees campaigns';
  update public.merchants set name = 'Cashier rename' where id = m1;
  get diagnostics n = row_count;
  assert n = 0, 'FAIL: cashier renamed merchant';
  begin
    update public.merchant_members set role_id = (select id from public.roles where merchant_id = m1 and key = 'admin') where user_id = uc;
    get diagnostics n = row_count;
    assert n = 0, 'FAIL: cashier self-promoted';
  exception when insufficient_privilege then null; end;

  -- ── anonymous visitor
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  assert (select count(*) from public.plan_prices) = 3, 'FAIL: anon cannot read prices';
  begin
    perform count(*) from public.merchants;
    raise exception 'FAIL: anon can read merchants';
  exception when insufficient_privilege then null; end;

  -- ── server (service role) enrolment
  perform set_config('role', 'postgres', true);
  r := public.enroll_customer(link_code, 'Leila', 'Ben Salah', '+21620000002', null, null, true);
  assert (r ->> 'ok')::boolean and length(r ->> 'card_token') >= 24, 'FAIL: enrol ' || r::text;
  assert (select balance from public.loyalty_cards where id = (r ->> 'card_id')::uuid) = 1, 'FAIL: welcome bonus';
  r := public.enroll_customer(link_code, 'Leila', null, '+21620000002', null);
  assert r ->> 'error' = 'already_enrolled' and not r ? 'card_token', 'FAIL: duplicate enrolment leaks token ' || r::text;
  ok := public.check_rate_limit('test:ip', 2, 60);
  ok := public.check_rate_limit('test:ip', 2, 60);
  assert ok, 'FAIL: rate limit allowed calls';
  assert not public.check_rate_limit('test:ip', 2, 60), 'FAIL: rate limit not enforced';

  -- ── super admin records a cash payment
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uadmin, 'role', 'authenticated')::text, true);
  assert (select count(*) from public.merchants where id in (m1, m2)) = 2, 'FAIL: admin cannot read all merchants';
  select id into price from public.plan_prices where period = 'semiannual';
  r := public.admin_record_payment(m1, price, 1, 499000, 'cash', 'REC-001');
  select * into sub from public.subscriptions where merchant_id = m1;
  assert sub.status = 'active' and sub.current_period_end > now() + interval '5 months', 'FAIL: subscription not extended';
  assert (select count(*) from public.payments where merchant_id = m1) = 1, 'FAIL: payment not stored';
  assert (select status from public.invoices where id = (r ->> 'invoice_id')::uuid) = 'paid', 'FAIL: invoice not paid';
  perform public.admin_set_merchant_status(m2, 'suspended', 'test');

  -- suspended merchant cannot operate
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  assert not public.has_merchant_permission(m2, 'customers.manage'), 'FAIL: suspended merchant still has permissions';

  perform set_config('role', 'postgres', true);
  assert (select count(*) from public.audit_logs where merchant_id = m1) >= 3, 'FAIL: audit trail';
  raise exception 'ALL_TESTS_PASSED';
end $$;
