import { getTranslations } from "next-intl/server";
import { PageHero } from "@/components/marketing/sections";
import { ContactForm } from "./contact-form";

export async function generateMetadata() {
  const t = await getTranslations("site");
  return { title: t("meta.contact"), description: t("contact.subtitle") };
}

export default async function ContactPage() {
  const t = await getTranslations("site.contact");
  return (<><PageHero title={t("title")} subtitle={t("subtitle")} /><section className="bg-white py-20"><div className="container-page max-w-2xl"><ContactForm /></div></section></>);
}
