import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Check } from "lucide-react";
import type { PublicPrice } from "@/lib/plans";
import { cn } from "@/lib/utils";

/** Brand pricing cards: tilted white cards on navy, condensed display numbers, lime badge (matches VAYRO price posters). */
export async function PricingCards({ prices }: { prices: PublicPrice[] }) {
  const t = await getTranslations("site.pricing");
  const suffix = (m: number) => (m === 1 ? t("perMonth") : m === 6 ? t("per6") : t("perYear"));
  const tilt = ["md:-rotate-2", "md:rotate-1 md:-translate-y-4", "md:-rotate-1"];
  return (
    <div className="grid gap-8 md:grid-cols-3 md:gap-6">
      {prices.map((p, i) => (
        <div key={p.id} className={cn("relative rounded-[28px] bg-white p-7 text-ink-900 shadow-xl ring-1 ring-lime-300/30 transition-transform duration-500 hover:rotate-0 hover:-translate-y-2", tilt[i % 3])}>
          <span className="absolute -end-3 -top-5 grid size-20 rotate-6 place-items-center rounded-full bg-lime-300 text-center text-sm font-bold leading-tight shadow-[0_0_30px_rgba(198,243,107,0.5)] ring-4 ring-ink-900">{p.label}</span>
          <div className="font-display text-[88px] leading-none tracking-tight">{p.amount_millimes / 1000}</div>
          <div className="mt-2 flex items-center gap-2 text-2xl font-bold"><span className="rounded-lg bg-lime-300 px-2">TND</span><span>{suffix(p.interval_months)}</span></div>
          <div className="my-5 h-0.5 w-full -rotate-1 bg-ink-900" />
          <p className="text-sm text-ink-500">{t("from")}</p>
          {p.badge && <p className="mt-2 inline-block -rotate-2 rounded-lg border-2 border-ink-900 px-2 py-0.5 font-display text-lg uppercase">{p.badge}</p>}
          <ul className="mt-5 space-y-2.5 text-sm font-medium">
            {(t.raw("features") as string[]).slice(0, 4).map((f) => <li key={f} className="flex items-center gap-2.5"><span className="grid size-5 place-items-center rounded-full bg-ink-900 text-lime-300"><Check className="size-3" strokeWidth={3} /></span>{f}</li>)}
          </ul>
          <Link href="/register" className="mt-7 flex h-12 items-center justify-center rounded-2xl bg-lime-300 font-bold uppercase tracking-wide ring-2 ring-ink-900 transition hover:bg-lime-200">{t("cta")}</Link>
        </div>
      ))}
    </div>
  );
}
