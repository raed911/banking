import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { AlertTriangle } from "lucide-react";
import { PageHero } from "@/components/marketing/sections";
import { LEGAL } from "@/lib/legal";

const docFor = async (doc: string) => {
  if (doc !== "terms" && doc !== "privacy") return null;
  const locale = (await getLocale()) as keyof typeof LEGAL;
  return (LEGAL[locale] ?? LEGAL.fr)[doc];
};

export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }) {
  const d = await docFor((await params).doc);
  return d ? { title: d.title } : {};
}

export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const d = await docFor((await params).doc);
  if (!d) notFound();
  return (
    <>
      <PageHero title={d.title} subtitle={d.updated} />
      <section className="bg-white py-20">
        <article className="container-page max-w-3xl space-y-8">
          <p className="flex items-start gap-2 rounded-2xl bg-warning-50 p-4 text-sm text-warning-700"><AlertTriangle className="mt-0.5 size-4 shrink-0" />{d.notice}</p>
          {d.sections.map((s) => <div key={s.h}><h2 className="text-xl font-semibold tracking-[-0.01em]">{s.h}</h2><p className="mt-2 leading-relaxed text-ink-600">{s.p}</p></div>)}
        </article>
      </section>
    </>
  );
}
