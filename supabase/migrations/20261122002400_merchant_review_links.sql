-- VAYRO · 0024 · Google Maps place link + review link, shown to customers on their card page and Wallet passes.
alter table public.merchants
  add column maps_url text check (maps_url is null or (maps_url ~ '^https://' and length(maps_url) <= 500)),
  add column review_url text check (review_url is null or (review_url ~ '^https://' and length(review_url) <= 500));
grant update (maps_url, review_url) on public.merchants to authenticated;
