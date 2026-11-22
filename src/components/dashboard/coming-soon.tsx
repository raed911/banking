import { getTranslations } from "next-intl/server";
import { Hammer } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/states";

export async function ComingSoon({ titleKey }: { titleKey: string }) {
  const t = await getTranslations("dash");
  return (
    <div className="space-y-8">
      <PageHeader title={t(`nav.${titleKey}` as "nav.overview")} />
      <EmptyState icon={<Hammer />} title={t("soon.title")} description={t("soon.desc")} />
    </div>
  );
}
