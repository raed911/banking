import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { requireMerchant } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const { merchantId } = await requireMerchant("settings.manage");
  const t = await getTranslations("settings");
  const supabase = await createClient();
  const { data: m } = await supabase.from("merchants").select("name, legal_name, tax_id, email, phone, website, address, city, locale, brand_color, logo_path").eq("id", merchantId).single();
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <SettingsForm merchantId={merchantId} m={m!} />
    </div>
  );
}
