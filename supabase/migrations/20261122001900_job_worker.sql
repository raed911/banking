-- VAYRO · 0019 · Background job worker: claim/finish primitives (service role only) + pg_net trigger every minute
create or replace function public.worker_claim_jobs(p_limit int default 20)
returns setof private.job_queue language plpgsql security definer set search_path = '' as $$
begin
  return query
  update private.job_queue j set status = 'running', attempts = j.attempts + 1, locked_at = now()
  where j.id in (
    select id from private.job_queue
    where (status = 'pending' and run_at <= now()) or (status = 'running' and locked_at < now() - interval '10 minutes')
    order by run_at limit least(p_limit, 100) for update skip locked)
  returning j.*;
end $$;

create or replace function public.worker_finish_job(p_id bigint, p_ok boolean, p_error text default null, p_defer_seconds int default null)
returns void language plpgsql security definer set search_path = '' as $$
declare j private.job_queue;
begin
  select * into j from private.job_queue where id = p_id for update;
  if not found then return; end if;
  if p_ok then
    update private.job_queue set status = 'done', finished_at = now(), last_error = null where id = p_id;
  elsif p_defer_seconds is not null then  -- waiting on an external precondition: does not consume attempts
    update private.job_queue set status = 'pending', attempts = greatest(j.attempts - 1, 0), run_at = now() + make_interval(secs => p_defer_seconds), last_error = p_error, locked_at = null where id = p_id;
  elsif j.attempts >= j.max_attempts then
    update private.job_queue set status = 'failed', finished_at = now(), last_error = p_error where id = p_id;
    insert into public.system_logs (level, source, message, context) values ('error', 'worker', coalesce(p_error, 'job failed'), jsonb_build_object('job_id', p_id, 'kind', j.kind, 'payload', j.payload));
  else
    update private.job_queue set status = 'pending', run_at = now() + make_interval(mins => power(2, j.attempts)::int), last_error = p_error, locked_at = null where id = p_id;
  end if;
end $$;

revoke all on function public.worker_claim_jobs(int), public.worker_finish_job(bigint, boolean, text, int) from public, anon, authenticated;
grant execute on function public.worker_claim_jobs(int), public.worker_finish_job(bigint, boolean, text, int) to service_role;

create extension if not exists pg_net;
