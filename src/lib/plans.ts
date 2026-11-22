import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

export type PublicPrice = { id: string; period: "monthly" | "semiannual" | "annual"; interval_months: number; amount_millimes: number; label: string | null; badge: string | null };

export const getPublicPrices = cache(async (): Promise<PublicPrice[]> => {
  const { data } = await createAdminClient().from("plan_prices").select("id, period, interval_months, amount_millimes, label, badge, plan:plans!inner(key, is_active, is_public)").eq("is_active", true).eq("plan.key", "pro").order("interval_months");
  return (data ?? []).map((p) => ({ id: p.id, period: p.period, interval_months: p.interval_months, amount_millimes: p.amount_millimes, label: p.label, badge: p.badge }));
});

export const getTrialDays = cache(async () => {
  const { data } = await createAdminClient().from("plans").select("trial_days").eq("key", "pro").maybeSingle();
  return data?.trial_days ?? 14;
});
