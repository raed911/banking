import { getTranslations } from "next-intl/server";
import { AppleWalletForm, GoogleWalletForm } from "@/components/integrations/wallet-forms";
import { PageHeader } from "@/components/ui/page-header";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { integrationState } from "@/lib/integration-state";

export default async function AdminIntegrations() {
  await requirePlatformAdmin();
  const t = await getTranslations("integ");
  const [google, apple] = await Promise.all([integrationState("google_wallet", null), integrationState("apple_wallet", null)]);
  return (
    <div className="space-y-6">
      <PageHeader title={t("platformTitle")} description={t("platformSubtitle")} />
      <div className="grid gap-6 xl:grid-cols-2"><GoogleWalletForm state={google} scope={{ kind: "platform" }} /><AppleWalletForm state={apple} scope={{ kind: "platform" }} /></div>
    </div>
  );
}
