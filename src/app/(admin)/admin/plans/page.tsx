import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PricesForm } from "./prices-form";

export default async function AdminPlans() {
  await requirePlatformAdmin();
  const t = await getTranslations("admin.plans");
  const db = createAdminClient();
  const { data: plans } = await db.from("plans").select("id, name, description, trial_days, plan_prices(id, period, interval_months, amount_millimes, badge)").order("sort");
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      {(plans ?? []).map((p) => <PricesForm key={p.id} plan={{ ...p, prices: [...p.plan_prices].sort((a, b) => a.interval_months - b.interval_months) }} />)}
    </div>
  );
}
