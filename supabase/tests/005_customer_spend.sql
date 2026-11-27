-- Amount spent: recorded on stamp programs too, summed per customer, reversals subtract; clients can't write it.
do $$
declare ua uuid := gen_random_uuid(); m1 uuid; prog uuid; cust uuid; card uuid; r jsonb; tx uuid;
begin
  insert into auth.users (id, email, aud, role, raw_user_meta_data, raw_app_meta_data, created_at, updated_at) values
    (ua, 'sp-' || ua || '@test.vayro', 'authenticated', 'authenticated', '{}', '{}', now(), now());
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  m1 := public.create_merchant('Spend A', 'spend-a-' || substr(ua::text, 1, 8));
  insert into public.loyalty_programs (merchant_id, name, type, status, stamps_required, cooldown_minutes, max_earn_per_day)
  values (m1, 'Carte', 'stamps', 'active', 10, 0, 10) returning id into prog;
  insert into public.customers (merchant_id, first_name, phone) values (m1, 'Amel', '+21622000001') returning id into cust;
  insert into public.loyalty_cards (merchant_id, program_id, customer_id) values (m1, prog, cust) returning id into card;

  r := public.apply_loyalty_transaction(card, 'earn', 1, 'spend-0001', null, 'scanner', 45500); -- 45.500 TND, 1 stamp
  assert (r ->> 'amount')::int = 1, 'FAIL: stamp program must still give 1 stamp, got ' || r;
  r := public.apply_loyalty_transaction(card, 'earn', 1, 'spend-0002', null, 'scanner', 20000);
  tx := (r ->> 'transaction_id')::uuid;
  r := public.apply_loyalty_transaction(card, 'earn', 1, 'spend-0003'); -- no amount typed
  assert (select total_spent_millimes from public.customers where id = cust) = 65500, 'FAIL: total spent';
  assert (select purchases_count from public.customers where id = cust) = 2, 'FAIL: purchases count';

  r := public.reverse_transaction(tx, 'erreur de caisse');
  assert (r ->> 'ok')::boolean, 'FAIL: reverse ' || r;
  assert (select total_spent_millimes from public.customers where id = cust) = 45500, 'FAIL: reversal not subtracted';

  begin
    update public.customers set total_spent_millimes = 999999999 where id = cust;
    raise exception 'FAIL: total spent writable by clients';
  exception when insufficient_privilege then null; end;
  raise exception 'ALL_TESTS_PASSED';
end $$;
