-- VAYRO · 0011 · PostgREST aggregates (count) need table-level SELECT. Card tokens are visible to the
-- merchant's own staff (RLS still restricts rows to customers.view holders of that merchant), which also
-- lets staff resend a customer's card link. Integration secrets stay column-restricted.
grant select on public.loyalty_cards to authenticated;
grant select on public.wallet_passes to authenticated;
