import { getTranslations } from "next-intl/server";
import { Check } from "lucide-react";
import { Faq, FinalCta } from "@/components/marketing/sections";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { getPublicPrices } from "@/lib/plans";

export async function generateMetadata() {
  const t = await getTranslations("site");
  return { title: t("meta.pricing"), description: t("pricing.subtitle") };
}

export default async function PricingPage() {
  const t = await getTranslations("site.pricing");
  const prices = await getPublicPrices();
  return (
    <>
      <section className="relative overflow-hidden bg-ink-900 pb-24 pt-36 text-white">
        <div className="bg-grid absolute inset-0" />
        <div className="container-page relative">
          <div className="mx-auto max-w-2xl text-center"><p className="font-script text-6xl text-lime-300 sm:text-7xl">{t("script")}</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{t("title")}</h1><p className="mt-4 text-lg text-ink-300">{t("subtitle")}</p></div>
          <div className="mt-20"><PricingCards prices={prices} /></div>
          <ul className="mx-auto mt-16 grid max-w-3xl gap-3 sm:grid-cols-2">{(t.raw("features") as string[]).map((f) => <li key={f} className="flex items-center gap-3 text-ink-200"><Check className="size-5 text-lime-300" />{f}</li>)}</ul>
          <p className="mt-10 text-center text-sm text-ink-400">{t("cash")}</p>
        </div>
      </section>
      <Faq />
      <FinalCta />
    </>
  );
}
