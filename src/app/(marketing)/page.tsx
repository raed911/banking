import { getTranslations } from "next-intl/server";
import { Faq, Features, FinalCta, Hero, HowItWorks, Industries, Security } from "@/components/marketing/sections";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { getPublicPrices } from "@/lib/plans";

export async function generateMetadata() {
  const t = await getTranslations("site.meta");
  return { title: { absolute: t("home") }, description: t("homeDesc"), openGraph: { title: t("home"), description: t("homeDesc"), type: "website" } };
}

export default async function HomePage() {
  const t = await getTranslations("site.pricing");
  const prices = await getPublicPrices();
  return (
    <>
      <Hero />
      <Industries />
      <HowItWorks />
      <Features />
      <section className="relative overflow-hidden bg-ink-900 py-24 text-white" id="pricing">
        <div className="bg-grid absolute inset-0" />
        <div className="container-page relative">
          <div className="mx-auto max-w-2xl text-center"><p className="font-script text-6xl text-lime-300">{t("script")}</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">{t("title")}</h2><p className="mt-3 text-ink-300">{t("subtitle")}</p></div>
          <div className="mt-16"><PricingCards prices={prices} /></div>
          <p className="mt-10 text-center text-sm text-ink-400">{t("cash")}</p>
        </div>
      </section>
      <Security />
      <Faq />
      <FinalCta />
    </>
  );
}
