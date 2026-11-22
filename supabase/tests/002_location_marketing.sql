-- Location marketing: tenant isolation, cross-tenant location injection, scheduler, pass-refresh jobs.
do $$
declare ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); m1 uuid; m2 uuid; l1 uuid; l2 uuid; c1 uuid; r jsonb; n int;
begin
  insert into auth.users (id, email, aud, role, raw_user_meta_data, raw_app_meta_data, created_at, updated_at) values
    (ua, 'geo-a-' || ua || '@test.vayro', 'authenticated', 'authenticated', '{}', '{}', now(), now()),
    (ub, 'geo-b-' || ub || '@test.vayro', 'authenticated', 'authenticated', '{}', '{}', now(), now());
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  m2 := public.create_merchant('Geo B', 'geo-b-' || substr(ub::text, 1, 8));
  select id into l2 from public.locations where merchant_id = m2;
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  m1 := public.create_merchant('Geo A', 'geo-a-' || substr(ua::text, 1, 8));
  select id into l1 from public.locations where merchant_id = m1;

  -- enabling geofencing requires coordinates
  begin
    update public.locations set geo_enabled = true where id = l1;
    raise exception 'FAIL: geo enabled without coordinates';
  exception when check_violation then null; end;
  update public.locations set latitude = 36.8065, longitude = 10.1815, geo_enabled = true, geo_radius_m = 150, geo_message = 'Bonjour' where id = l1;
  begin
    update public.locations set geo_radius_m = 5000 where id = l1;
    raise exception 'FAIL: radius out of range accepted';
  exception when check_violation then null; end;

  -- campaign on own location ok; on another merchant's location refused
  insert into public.location_campaigns (merchant_id, name, message, location_ids, starts_at, ends_at, status)
  values (m1, 'Happy hour', '-20% maintenant', array[l1], now() - interval '1 minute', now() + interval '1 hour', 'scheduled') returning id into c1;
  begin
    insert into public.location_campaigns (merchant_id, name, message, location_ids, starts_at, ends_at)
    values (m1, 'Intrusion', 'xxx', array[l2], now(), now() + interval '1 hour');
    raise exception 'FAIL: foreign location accepted';
  exception when insufficient_privilege then null; end;

  r := public.location_campaign_stats(c1);
  assert r ? 'visits' and r ? 'passes_reached', 'FAIL: stats shape ' || r::text;

  -- other tenant sees nothing and cannot read stats
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  assert (select count(*) from public.location_campaigns where merchant_id = m1) = 0, 'FAIL: B sees A campaigns';
  begin
    perform public.location_campaign_stats(c1);
    raise exception 'FAIL: B read A stats';
  exception when insufficient_privilege then null; end;
  begin
    perform public.admin_location_marketing();
    raise exception 'FAIL: non-admin used admin view';
  exception when insufficient_privilege then null; end;

  -- scheduler activates, pass refresh jobs are queued
  perform set_config('role', 'postgres', true);
  r := private.run_location_campaign_scheduler();
  assert (select status from public.location_campaigns where id = c1) = 'active', 'FAIL: scheduler did not activate';
  select count(*) into n from private.job_queue where kind = 'wallet.refresh_merchant' and payload ->> 'merchant_id' = m1::text and status = 'pending';
  assert n = 1, 'FAIL: expected exactly one deduplicated refresh job, got ' || n;
  update public.location_campaigns set ends_at = now() - interval '1 second', starts_at = now() - interval '2 hours' where id = c1;
  r := private.run_location_campaign_scheduler();
  assert (select status from public.location_campaigns where id = c1) = 'ended', 'FAIL: scheduler did not end';
  raise exception 'ALL_TESTS_PASSED';
end $$;
