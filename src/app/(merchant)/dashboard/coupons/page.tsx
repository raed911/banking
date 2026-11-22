import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { requireMerchant } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { CouponsManager } from "./coupons-manager";

export default async function CouponsPage() {
  const { merchantId, permissions } = await requireMerchant();
  const t = await getTranslations("coupons");
  const supabase = await createClient();
  const { data } = await supabase.from("coupons").select("*").eq("merchant_id", merchantId).neq("status", "archived").order("created_at", { ascending: false });
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <CouponsManager coupons={data ?? []} canEdit={can(permissions, "coupons.manage")} />
    </div>
  );
}
