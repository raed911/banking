import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

/** Loads everything the public card page needs, by the card's secret token. Service role: token is the credential. */
export const getPublicCard = cache(async (token: string) => {
  if (!/^[A-Za-z0-9_-]{24,64}$/.test(token)) return null;
  const db = createAdminClient();
  const { data: card } = await db
    .from("loyalty_cards")
    .select("id, serial, balance, lifetime_earned, status, created_at, program_id, merchant_id, referral_code, customer:customers(first_name), program:loyalty_programs(name, type, status, stamps_required, reward_title, terms, referral_enabled, referral_reward), merchant:merchants(name, status, logo_path, phone, city)")
    .eq("public_token", token)
    .maybeSingle();
  if (!card) return null;
  const [{ data: design }, { data: rewards }, { data: history }] = await Promise.all([
    db.from("card_designs").select("*").eq("program_id", card.program_id).maybeSingle(),
    db.from("rewards").select("id, name, description, cost, stock").eq("program_id", card.program_id).eq("is_active", true).order("cost"),
    db.from("loyalty_transactions").select("id, kind, amount, created_at, note").eq("card_id", card.id).order("created_at", { ascending: false }).limit(15),
  ]);
  return { card, design, rewards: rewards ?? [], history: history ?? [] };
});
