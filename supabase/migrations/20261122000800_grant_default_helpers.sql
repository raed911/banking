-- VAYRO · 0008 · Column defaults on client-writable tables call these generators.
grant execute on function private.random_code(int), private.random_token(int) to authenticated;
