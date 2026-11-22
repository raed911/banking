-- VAYRO · 0007 · Seed plans (Tunisia / TND) and scheduled jobs
insert into public.plans (key, name, description, features, limits, trial_days, sort)
values ('pro', 'Pro', 'Tout VAYRO, par point de vente.',
  '["QR code + NFC inclus","Carte dans Apple & Google Wallet","Zéro appli à installer","Programmes tampons, points et visites","Récompenses, coupons et campagnes","Statistiques et équipe illimitée"]'::jsonb,
  '{"programs": 10, "employees": null, "customers": null}'::jsonb, 14, 1)
on conflict (key) do update set name = excluded.name, description = excluded.description, features = excluded.features, limits = excluded.limits;

insert into public.plan_prices (plan_id, period, interval_months, amount_millimes, currency, label, badge)
select p.id, v.period::public.billing_period, v.months, v.amount, 'TND', v.label, v.badge
from public.plans p,
  (values ('monthly', 1, 99000::bigint, 'Simple', null),
          ('semiannual', 6, 499000::bigint, '6 mois', '1 mois offert'),
          ('annual', 12, 999000::bigint, 'Annuel', '2 mois offerts')) as v(period, months, amount, label, badge)
where p.key = 'pro'
on conflict (plan_id, period, currency) do update set amount_millimes = excluded.amount_millimes, label = excluded.label, badge = excluded.badge;

insert into public.platform_settings (key, value) values
  ('billing', '{"currency":"TND","grace_days":3,"payment_instructions":"Paiement en espèces auprès de l''équipe VAYRO. Indiquez votre numéro de facture."}'::jsonb),
  ('support', '{"email":null,"phone":null,"whatsapp":null}'::jsonb)
on conflict (key) do nothing;

-- pg_cron (available on Supabase). Skipped gracefully where not installed.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('vayro-subscription-maintenance', '15 0 * * *', 'select private.run_subscription_maintenance()');
  perform cron.schedule('vayro-cleanup', '30 3 * * *', $c$
    delete from private.rate_limits where window_start < now() - interval '1 day';
    delete from private.job_queue where status = 'done' and finished_at < now() - interval '14 days';
    delete from public.system_logs where created_at < now() - interval '90 days' and level in ('debug','info');
  $c$);
exception when others then
  raise notice 'pg_cron not available: %', sqlerrm;
end $$;
