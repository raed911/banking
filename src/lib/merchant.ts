import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const getSubscription = cache(async (merchantId: string) => {
  const supabase = await createClient();
  const { data } = await supabase.from("subscriptions").select("status, trial_ends_at, current_period_end, quantity, plan_id, price_id, cancel_at_period_end").eq("merchant_id", merchantId).maybeSingle();
  return data;
});

export type AccessState = "ok" | "trialing" | "past_due" | "expired" | "suspended";

export function accessState(merchantStatus: string, sub: Awaited<ReturnType<typeof getSubscription>>): { state: AccessState; daysLeft?: number } {
  if (merchantStatus !== "active") return { state: "suspended" };
  if (!sub) return { state: "expired" };
  const now = Date.now();
  if (sub.status === "trialing") {
    const end = sub.trial_ends_at ? new Date(sub.trial_ends_at).getTime() : 0;
    return end > now ? { state: "trialing", daysLeft: Math.max(0, Math.ceil((end - now) / 86_400_000) - 1) } : { state: "expired" };
  }
  if (sub.status === "active") return { state: "ok" };
  if (sub.status === "past_due") return { state: "past_due" };
  return { state: "expired" };
}
