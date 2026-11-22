import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { requireMerchant } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { getSubscription } from "@/lib/merchant";
import { createClient } from "@/lib/supabase/server";
import { LocationsManager } from "./locations-manager";

export default async function LocationsPage() {
  const { merchantId, permissions } = await requireMerchant();
  const t = await getTranslations("settings.locations");
  const supabase = await createClient();
  const [{ data: locations }, sub] = await Promise.all([
    supabase.from("locations").select("id, name, address, city, phone, is_active").eq("merchant_id", merchantId).order("created_at"),
    getSubscription(merchantId),
  ]);
  const used = (locations ?? []).filter((l) => l.is_active).length;
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <p className="text-sm font-medium text-fg-muted">{t("usage", { used, max: sub?.quantity ?? 1 })}</p>
      <LocationsManager locations={locations ?? []} canEdit={can(permissions, "locations.manage")} />
    </div>
  );
}
