import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, type Permission } from "@/lib/permissions";

/**
 * Current user from the session JWT. The project signs tokens with an asymmetric key (ES256), so
 * getClaims() verifies the signature locally (JWKS cached) instead of calling the Auth server on
 * every request. The database still enforces RLS with the same verified token.
 */
export const getUser = cache(async (): Promise<{ id: string; email: string | undefined } | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const c = data?.claims;
  if (!c?.sub) return null;
  return { id: c.sub, email: typeof c.email === "string" ? c.email : undefined };
});

export async function requireUser(next?: string) {
  const user = await getUser();
  if (!user) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return user;
}

/** True for platform-admin accounts (UI routing). Real powers additionally require an MFA (AAL2) session. */
export const isPlatformAdmin = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_platform_admin_account");
  return data === true;
});

export async function getAal() {
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return { current: data?.currentLevel ?? "aal1", next: data?.nextLevel ?? "aal1" };
}

export type Membership = {
  merchant: { id: string; name: string; slug: string; logo_path: string | null; status: string; brand_color: string; timezone: string; locale: string; onboarding_completed_at: string | null };
  role: { id: string; key: string; name: string; permissions: string[] };
};

export const getMemberships = cache(async (): Promise<Membership[]> => {
  const user = await getUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("merchant_members")
    .select("merchant:merchants!inner(id, name, slug, logo_path, status, brand_color, timezone, locale, onboarding_completed_at), role:roles!inner(id, key, name, permissions)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at");
  return (data ?? []) as unknown as Membership[];
});

/** Active merchant = profile.last_merchant_id if still a member, else the first membership. */
export const getActiveMembership = cache(async (): Promise<Membership | null> => {
  const user = await getUser();
  if (!user) return null;
  const memberships = await getMemberships();
  if (memberships.length === 0) return null;
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("last_merchant_id").eq("id", user.id).single();
  return memberships.find((m) => m.merchant.id === profile?.last_merchant_id) ?? memberships[0]!;
});

/** For merchant dashboard pages: signed in, has a merchant, optionally a permission. */
export async function requireMerchant(perm?: Permission) {
  const user = await requireUser("/dashboard");
  const membership = await getActiveMembership();
  if (!membership) redirect("/onboarding");
  if (perm && !can(membership.role.permissions, perm)) redirect("/dashboard?denied=1");
  return { user, membership, merchantId: membership.merchant.id, permissions: membership.role.permissions };
}

export async function requirePlatformAdmin() {
  const user = await requireUser("/admin");
  if (!(await isPlatformAdmin())) redirect("/dashboard");
  const aal = await getAal();
  if (aal.current !== "aal2") redirect(aal.next === "aal2" ? "/account/mfa?next=/admin" : "/account?require=mfa");
  return user;
}
