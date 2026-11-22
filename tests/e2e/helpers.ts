import { createClient } from "@supabase/supabase-js";

export function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SECRET_KEY!;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function createConfirmedUser(prefix = "e2e") {
  const email = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.vayro.app`;
  const password = "Vayro-test-2026";
  const { data, error } = await admin().auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: "E2E Tester" } });
  if (error) throw error;
  return { id: data.user.id, email, password };
}

export async function deleteUserAndMerchants(userId: string) {
  const db = admin();
  const { data } = await db.from("merchants").select("id").eq("created_by", userId);
  for (const m of data ?? []) await db.from("merchants").delete().eq("id", m.id);
  await db.auth.admin.deleteUser(userId);
}
