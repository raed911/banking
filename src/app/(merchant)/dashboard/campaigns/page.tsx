import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { requireMerchant } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { CampaignsManager, type CampaignRow } from "./campaigns-manager";
import { Automations, type Automation } from "./automations";

export default async function CampaignsPage() {
  const { merchantId } = await requireMerchant("campaigns.manage");
  const t = await getTranslations("camp");
  const supabase = await createClient();
  const [{ data: campaigns }, { data: programs }, { data: coupons }, { data: customers }, { data: integ }, { data: automations }] = await Promise.all([
    supabase.from("campaigns").select("id, name, channel, status, segment, subject, content, coupon_id, scheduled_at, stats, created_at").eq("merchant_id", merchantId).order("created_at", { ascending: false }).limit(100),
    supabase.from("loyalty_programs").select("id, name").eq("merchant_id", merchantId).neq("status", "archived"),
    supabase.from("coupons").select("id, name").eq("merchant_id", merchantId).eq("status", "active"),
    supabase.from("customers").select("tags").eq("merchant_id", merchantId).is("deleted_at", null).not("tags", "eq", "{}").limit(1000),
    createAdminClient().from("integrations").select("provider, status").in("provider", ["resend", "apple_wallet", "google_wallet"]).or(`merchant_id.is.null,merchant_id.eq.${merchantId}`),
    supabase.from("automations").select("kind, enabled, channel, inactive_days, cooldown_days, message, coupon_id, total_sent, last_run_at").eq("merchant_id", merchantId),
  ]);
  const ok = (p: string) => (integ ?? []).some((i) => i.provider === p && i.status === "verified");
  const tags = [...new Set((customers ?? []).flatMap((c) => c.tags))].sort();
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <Automations automations={(automations ?? []) as NonNullable<Automation>[]} coupons={coupons ?? []} connected={{ email: ok("resend"), wallet: ok("apple_wallet") || ok("google_wallet") }} />
      <h2 className="pt-4 text-lg font-semibold tracking-[-0.02em]">{t("title")}</h2>
      <CampaignsManager campaigns={(campaigns ?? []) as unknown as CampaignRow[]} programs={programs ?? []} coupons={coupons ?? []} tags={tags}
        connected={{ email: ok("resend"), wallet: ok("apple_wallet") || ok("google_wallet"), card: true }} />
    </div>
  );
}
