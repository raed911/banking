import { getTranslations } from "next-intl/server";
import { Info } from "lucide-react";
import { AppleWalletForm, GoogleWalletForm } from "@/components/integrations/wallet-forms";
import { PageHeader } from "@/components/ui/page-header";
import { requireMerchant } from "@/lib/auth/session";
import { integrationState } from "@/lib/integration-state";

export default async function IntegrationsPage() {
  const { merchantId } = await requireMerchant("integrations.manage");
  const t = await getTranslations("integ");
  const [google, apple] = await Promise.all([integrationState("google_wallet", merchantId), integrationState("apple_wallet", merchantId)]);
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <p className="flex items-start gap-3 rounded-2xl border border-info-500/20 bg-info-50 p-4 text-sm text-info-700"><Info className="mt-0.5 size-4 shrink-0" />{t("merchantNote")}</p>
      <div className="grid gap-6 xl:grid-cols-2"><GoogleWalletForm state={google} scope={{ kind: "merchant" }} /><AppleWalletForm state={apple} scope={{ kind: "merchant" }} /></div>
    </div>
  );
}
