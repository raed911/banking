import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "https://vayro-app.vercel.app";

/** The program's usable sign-up link (active, not expired, not exhausted), or null. */
export async function programJoinCode(programId: string) {
  const { data } = await createAdminClient().from("enrollment_links").select("code, expires_at, max_uses, uses")
    .eq("program_id", programId).eq("is_active", true).order("created_at").limit(10);
  return (data ?? []).find((l) => (!l.expires_at || new Date(l.expires_at) > new Date()) && (l.max_uses == null || l.uses < l.max_uses))?.code ?? null;
}

export function referralUrl(joinCode: string, referralCode: string) {
  return `${appUrl()}/join/${joinCode}?ref=${referralCode}`;
}

/** Personal invitation link of a card + how many friends it brought. */
export async function referralInfo(card: { id: string; program_id: string; referral_code: string }) {
  const joinCode = await programJoinCode(card.program_id);
  if (!joinCode) return null;
  const { data } = await createAdminClient().from("referrals").select("status").eq("referrer_card_id", card.id);
  return {
    url: referralUrl(joinCode, card.referral_code),
    invited: data?.length ?? 0,
    completed: (data ?? []).filter((r) => r.status === "completed").length,
  };
}
