import { getTranslations } from "next-intl/server";
import { FinalCta, PageHero } from "@/components/marketing/sections";

export async function generateMetadata() {
  const t = await getTranslations("site");
  return { title: t("meta.about"), description: t("about.p2") };
}

export default async function AboutPage() {
  const t = await getTranslations("site.about");
  return (
    <>
      <PageHero eyebrow="VAYRO" title={t("title")} />
      <section className="bg-white py-24">
        <div className="container-page grid max-w-5xl gap-12 lg:grid-cols-2">
          <p className="text-2xl leading-relaxed tracking-[-0.01em] text-ink-700">{t("p1")}</p>
          <p className="text-2xl font-medium leading-relaxed tracking-[-0.01em]">{t("p2")}</p>
        </div>
        <div className="container-page mt-20 max-w-5xl">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-500">{t("valuesTitle")}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">{(t.raw("values") as { t: string; d: string }[]).map((v, i) => (
            <div key={v.t} className="rounded-3xl border border-ink-150 bg-ink-50 p-7"><span className="font-display text-5xl text-lime-500">0{i + 1}</span><h3 className="mt-4 text-xl font-semibold">{v.t}</h3><p className="mt-2 text-ink-500">{v.d}</p></div>
          ))}</div>
        </div>
      </section>
      <FinalCta />
    </>
  );
}
