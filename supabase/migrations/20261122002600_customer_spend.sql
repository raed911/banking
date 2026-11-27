-- VAYRO · 0026 · Amount spent per customer.
-- Staff can type the amount paid when adding a stamp/visit (points programs already record it);
-- customers.total_spent_millimes / purchases_count are kept up to date from the ledger (reversals subtract).
alter table public.customers
  add column total_spent_millimes bigint not null default 0,
  add column purchases_count int not null default 0;
create index customers_spent_idx on public.customers (merchant_id, total_spent_millimes desc) where deleted_at is null;

create or replace function private.track_customer_spend()
returns trigger language plpgsql security definer set search_path = '' as $$
declare orig public.loyalty_transactions;
begin
  if new.kind = 'earn' and coalesce(new.purchase_amount_millimes, 0) > 0 then
    update public.customers set total_spent_millimes = total_spent_millimes + new.purchase_amount_millimes, purchases_count = purchases_count + 1
    where id = new.customer_id;
  elsif new.kind = 'reverse' and new.reversed_transaction_id is not null then
    select * into orig from public.loyalty_transactions where id = new.reversed_transaction_id;
    if found and orig.kind = 'earn' and coalesce(orig.purchase_amount_millimes, 0) > 0 then
      update public.customers set total_spent_millimes = greatest(total_spent_millimes - orig.purchase_amount_millimes, 0), purchases_count = greatest(purchases_count - 1, 0)
      where id = new.customer_id;
    end if;
  end if;
  return null;
end $$;
create trigger loyalty_transactions_spend after insert on public.loyalty_transactions for each row execute function private.track_customer_spend();

-- backfill from the existing ledger
update public.customers c set total_spent_millimes = s.total, purchases_count = s.n
from (
  select t.customer_id, sum(t.purchase_amount_millimes)::bigint as total, count(*)::int as n
  from public.loyalty_transactions t
  where t.kind = 'earn' and coalesce(t.purchase_amount_millimes, 0) > 0
    and not exists (select 1 from public.loyalty_transactions r where r.reversed_transaction_id = t.id)
  group by t.customer_id
) s where s.customer_id = c.id;
