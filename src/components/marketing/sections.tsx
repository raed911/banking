import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, BarChart3, Building2, CreditCard, Languages, Lock, ScanLine, ShieldCheck, Stamp, Ticket, Users } from "lucide-react";
import { WalletCard } from "@/components/loyalty/wallet-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export async function PageHero({ title, subtitle, eyebrow }: { title: string; subtitle?: string; eyebrow?: string }) {
  return (
    <section className="relative overflow-hidden bg-ink-900 pb-20 pt-36 text-white">
      <div className="bg-grid absolute inset-0" />
      <div className="absolute start-1/2 top-0 size-[600px] -translate-x-1/2 rounded-full bg-lime-300/10 blur-[120px]" />
      <div className="container-page relative max-w-3xl text-center">
        {eyebrow && <p className="font-script text-4xl text-lime-300">{eyebrow}</p>}
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">{title}</h1>
        {subtitle && <p className="mx-auto mt-5 max-w-xl text-lg text-ink-300">{subtitle}</p>}
      </div>
    </section>
  );
}

export async function Hero() {
  const t = await getTranslations("site");
  return (
    <section className="relative overflow-hidden bg-ink-900 pb-24 pt-32 text-white sm:pt-40">
      <div className="bg-grid absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className="absolute -end-40 top-20 size-[620px] rounded-full bg-lime-300/15 blur-[140px]" />
      <div className="container-page relative grid items-center gap-16 lg:grid-cols-[1.15fr_1fr]">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-lime-300"><span className="size-1.5 animate-pulse rounded-full bg-lime-300" />{t("hero.eyebrow")}</span>
          <h1 className="mt-6 text-[44px] font-semibold leading-[1.02] tracking-[-0.045em] sm:text-7xl">
            {t("hero.title1")} <span className="block text-ink-400">{t("hero.title2")}</span> <span className="relative inline-block text-lime-300">{t("hero.title3")}<svg className="absolute -bottom-2 start-0 w-full" viewBox="0 0 300 12" fill="none" aria-hidden><path d="M2 9C80 3 200 2 298 7" stroke="#C6F36B" strokeWidth="3" strokeLinecap="round" /></svg></span>
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink-300">{t("hero.subtitle")}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild variant="accent" size="xl"><Link href="/register">{t("hero.cta")}<ArrowRight className="rtl:rotate-180" /></Link></Button>
            <Button asChild variant="glass" size="xl"><Link href="/pricing">{t("hero.secondary")}</Link></Button>
          </div>
          <p className="mt-5 text-sm text-ink-400">{t("hero.note")}</p>
        </div>
        <div className="relative mx-auto h-[540px] w-full max-w-[420px]" aria-hidden>
          <div className="absolute inset-x-6 top-0 h-full rounded-[48px] border-[10px] border-ink-800 bg-ink-950 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.6)]">
            <div className="mx-auto mt-3 h-6 w-28 rounded-full bg-ink-800" />
            <div className="px-4 pt-6"><WalletCard merchantName="Café Lumière" programName="Carte café" type="stamps" stampsRequired={10} balance={7} customerName="Leila B." rewardTitle="Café offert" serial="VY7K29QM4C" /></div>
          </div>
          <div className="absolute -start-4 top-24 animate-float rounded-2xl bg-white px-4 py-3 text-ink-900 shadow-xl [animation-delay:-2s] sm:-start-10">
            <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-lime-300"><Stamp className="size-4" /></span><div><div className="text-sm font-semibold">+1 tampon</div><div className="text-xs text-ink-500">Café Lumière · maintenant</div></div></div>
          </div>
          <div className="absolute -end-2 bottom-24 w-56 animate-float rounded-2xl bg-lime-300 p-4 text-ink-900 shadow-xl sm:-end-8">
            <div className="text-xs font-semibold uppercase tracking-[0.14em]">Taux de retour</div>
            <div className="font-display text-5xl leading-none">+38%</div>
            <div className="mt-2 flex h-8 items-end gap-1">{[30, 45, 35, 60, 55, 80, 95].map((h, i) => <span key={i} className="flex-1 rounded-sm bg-ink-900" style={{ height: `${h}%` }} />)}</div>
          </div>
        </div>
      </div>
      <div className="container-page relative mt-20 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 md:grid-cols-4">
        {(t.raw("stats") as { v: string; l: string }[]).map((s) => (
          <div key={s.l} className="bg-ink-900 p-6"><div className="font-display text-4xl text-white">{s.v}</div><div className="mt-1 text-sm text-ink-400">{s.l}</div></div>
        ))}
      </div>
    </section>
  );
}

export async function Industries() {
  const t = await getTranslations("site.industries");
  const list = t.raw("list") as string[];
  return (
    <section className="overflow-hidden border-b border-ink-100 bg-white py-10">
      <p className="text-center text-sm font-medium text-ink-500">{t("title")}</p>
      <div className="mt-6 flex w-max animate-[marquee_30s_linear_infinite] gap-4 rtl:animate-[marquee-rtl_30s_linear_infinite]">
        {[...list, ...list, ...list].map((x, i) => <span key={i} className="whitespace-nowrap rounded-full border border-ink-150 px-5 py-2 text-lg font-medium text-ink-700">{x}</span>)}
      </div>
    </section>
  );
}

export async function HowItWorks() {
  const t = await getTranslations("site.how");
  const steps = t.raw("steps") as { t: string; d: string }[];
  return (
    <section className="bg-white py-24">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center"><h2 className="text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">{t("title")}</h2><p className="mt-4 text-lg text-ink-500">{t("subtitle")}</p></div>
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.t} className="group relative overflow-hidden rounded-3xl border border-ink-150 bg-ink-50 p-8 transition hover:-translate-y-1 hover:shadow-lg">
              <span className="font-display text-7xl text-ink-200 transition group-hover:text-lime-400">0{i + 1}</span>
              <h3 className="mt-6 text-xl font-semibold tracking-[-0.02em]">{s.t}</h3>
              <p className="mt-2 leading-relaxed text-ink-500">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FEATURE_ICONS = [CreditCard, Stamp, ScanLine, ShieldCheck, Ticket, BarChart3, Users, Building2, Languages];

export async function Features({ compact }: { compact?: boolean }) {
  const t = await getTranslations("site.features");
  const items = t.raw("items") as { t: string; d: string }[];
  return (
    <section className={cn("bg-ink-50", compact ? "py-20" : "py-24")}>
      <div className="container-page">
        {!compact && <div className="mx-auto max-w-2xl text-center"><h2 className="text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">{t("title")}</h2><p className="mt-4 text-lg text-ink-500">{t("subtitle")}</p></div>}
        <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", !compact && "mt-16")}>
          {items.map((f, i) => {
            const Icon = FEATURE_ICONS[i] ?? Stamp;
            return (
              <div key={f.t} className="rounded-3xl border border-ink-150 bg-white p-7 transition hover:border-ink-300 hover:shadow-md">
                <span className={cn("grid size-12 place-items-center rounded-2xl", i === 0 ? "bg-lime-300 text-ink-900" : "bg-ink-900 text-lime-300")}><Icon className="size-5" /></span>
                <h3 className="mt-5 text-lg font-semibold tracking-[-0.01em]">{f.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{f.d}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export async function Security() {
  const t = await getTranslations("site.security");
  return (
    <section className="relative overflow-hidden bg-ink-900 py-24 text-white">
      <div className="bg-grid absolute inset-0 opacity-50" />
      <div className="container-page relative grid items-center gap-12 lg:grid-cols-2">
        <div><Lock className="size-10 text-lime-300" /><h2 className="mt-6 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">{t("title")}</h2><p className="mt-5 max-w-lg text-lg text-ink-300">{t("d")}</p></div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {(t.raw("points") as string[]).map((p) => <li key={p} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><ShieldCheck className="size-5 text-lime-300" /><p className="mt-3 font-medium">{p}</p></li>)}
        </ul>
      </div>
    </section>
  );
}

export async function Faq() {
  const t = await getTranslations("site.faq");
  return (
    <section className="bg-white py-24">
      <div className="container-page max-w-3xl">
        <h2 className="text-center text-4xl font-semibold tracking-[-0.03em]">{t("title")}</h2>
        <div className="mt-12 divide-y divide-ink-150 rounded-3xl border border-ink-150">
          {(t.raw("items") as { q: string; a: string }[]).map((f) => (
            <details key={f.q} className="group p-6 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">{f.q}<span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink-100 text-xl transition group-open:rotate-45">+</span></summary>
              <p className="mt-3 leading-relaxed text-ink-500">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export async function FinalCta() {
  const t = await getTranslations("site.cta");
  return (
    <section className="bg-white pb-24">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-[40px] bg-lime-300 px-8 py-16 text-center text-ink-900 sm:px-16">
          <div className="bg-grid-ink absolute inset-0" />
          <h2 className="relative text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">{t("title")}</h2>
          <p className="relative mt-4 text-lg">{t("subtitle")}</p>
          <Button asChild size="xl" className="relative mt-8"><Link href="/register">{t("button")}<ArrowRight className="rtl:rotate-180" /></Link></Button>
        </div>
      </div>
    </section>
  );
}
