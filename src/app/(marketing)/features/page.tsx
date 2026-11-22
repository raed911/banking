import { getTranslations } from "next-intl/server";
import { Features, FinalCta, HowItWorks, PageHero, Security } from "@/components/marketing/sections";

export async function generateMetadata() {
  const t = await getTranslations("site");
  return { title: t("meta.features"), description: t("features.subtitle") };
}

export default async function FeaturesPage() {
  const t = await getTranslations("site.features");
  return (<><PageHero title={t("title")} subtitle={t("subtitle")} /><Features compact /><HowItWorks /><Security /><div className="pt-24"><FinalCta /></div></>);
}
