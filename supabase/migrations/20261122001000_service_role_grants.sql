-- VAYRO · 0010 · The server-side service role (used only in trusted server code) needs table access.
-- New projects created with "automatic API grants" disabled do not grant it by default.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
