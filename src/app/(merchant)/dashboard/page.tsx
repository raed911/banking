import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowRight, CheckCircle2, Circle, CreditCard, Gift, Megaphone, Plus, Repeat, ScanLine, ShieldAlert, Smartphone, Stamp, UserPlus, Users } from "lucide-react";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { requireMerchant } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { cn, formatNumber } from "@/lib/utils";

type Overview = {
  days: number; customers_total: number; customers_new: number; customers_new_prev: number; cards_active: number; wallet_passes: number;
  visits: number; visits_prev: number; earned: number; earned_prev: number; rewards_redeemed: number; rewards_redeemed_prev: number;
  returning_customers: number; active_customers: number; series: { day: string; earned: number; redeemed: number }[];
  programs: number; programs_active: number; has_design: boolean; has_link: boolean; members: number; fraud_open: number;
};

const delta = (cur: number, prev: number) => (prev === 0 ? (cur > 0 ? 100 : null) : ((cur - prev) / prev) * 100);

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { merchantId, membership, permissions, user } = await requireMerchant();
  if (!can(permissions, "dashboard.view")) redirect(can(permissions, "cards.earn") ? "/scan" : "/dashboard/customers");
  const t = await getTranslations("dash.overview");
  const days = [7, 30, 90].includes(Number((await searchParams).days)) ? Number((await searchParams).days) : 30;
  const supabase = await createClient();
  const [{ data }, { data: profile }] = await Promise.all([
    supabase.rpc("merchant_overview", { p_merchant_id: merchantId, p_days: days }),
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
  ]);
  const o = data as unknown as Overview;
  const firstName = (profile?.full_name ?? "").split(" ")[0] || "";
  const returnRate = o.active_customers ? Math.round((o.returning_customers / o.active_customers) * 100) : 0;
  const hasActivity = o.series.some((s) => s.earned > 0 || s.redeemed > 0);

  const steps = [
    { key: "stepProgram", done: o.programs_active > 0, href: "/dashboard/programs/new", icon: CreditCard },
    { key: "stepDesign", done: o.has_design, href: "/dashboard/programs", icon: Stamp },
    { key: "stepLink", done: o.has_link, href: "/dashboard/programs", icon: Smartphone },
    { key: "stepTeam", done: o.members > 1, href: "/dashboard/employees", icon: UserPlus },
  ] as const;
  const doneCount = steps.filter((s) => s.done).length;

  const quick = [
    { key: "quickScan", href: "/scan", icon: ScanLine, perm: "cards.earn" },
    { key: "quickCustomer", href: "/dashboard/customers?new=1", icon: Users, perm: "customers.manage" },
    { key: "quickProgram", href: "/dashboard/programs/new", icon: Plus, perm: "programs.manage" },
    { key: "quickCampaign", href: "/dashboard/campaigns", icon: Megaphone, perm: "campaigns.manage" },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="animate-fade-up">
          <h1 className="text-2xl font-semibold tracking-[-0.03em] sm:text-[30px]">{t("greeting", { name: firstName })} <span className="inline-block origin-[70%_70%] animate-[wave_2s_ease-in-out_1]">👋</span></h1>
          <p className="mt-1 text-fg-muted">{t("subtitle", { merchant: membership.merchant.name })}</p>
        </div>
        <div className="inline-flex rounded-xl bg-surface-sunken p-1" role="tablist">
          {[7, 30, 90].map((d) => (
            <Link key={d} href={`/dashboard?days=${d}`} role="tab" aria-selected={d === days} className={cn("rounded-lg px-3 py-1.5 text-sm font-medium transition", d === days ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg")}><span className="sm:hidden">{t("periodShort", { days: d })}</span><span className="hidden sm:inline">{t("period", { days: d })}</span></Link>
          ))}
        </div>
      </div>

      {o.fraud_open > 0 && can(permissions, "transactions.view") && (
        <Link href="/dashboard/transactions?tab=fraud" className="flex items-center justify-between gap-3 rounded-2xl border border-danger-500/20 bg-danger-50 px-4 py-3 text-sm font-medium text-danger-700 transition hover:bg-danger-50/70">
          <span className="flex items-center gap-2"><ShieldAlert className="size-4" />{t("fraudAlert", { count: o.fraud_open })}</span>
          <span className="flex items-center gap-1">{t("review")}<ArrowRight className="size-4 rtl:rotate-180" /></span>
        </Link>
      )}

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard highlight label={t("customers")} value={formatNumber(o.customers_total)} delta={delta(o.customers_new, o.customers_new_prev)} deltaLabel={`+${o.customers_new} ${t("newCustomers")}`} icon={<Users />} />
        <StatCard label={t("visits")} value={formatNumber(o.visits)} delta={delta(o.visits, o.visits_prev)} deltaLabel={t("vsPrevious")} icon={<Stamp />} />
        <StatCard label={t("rewards")} value={formatNumber(o.rewards_redeemed)} delta={delta(o.rewards_redeemed, o.rewards_redeemed_prev)} deltaLabel={t("vsPrevious")} icon={<Gift />} />
        <StatCard label={t("returnRate")} value={`${returnRate}%`} icon={<Repeat />}>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-sunken"><div className="h-full rounded-full bg-lime-400 transition-all duration-700" style={{ width: `${returnRate}%` }} /></div>
        </StatCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <div><CardTitle>{t("activity")}</CardTitle><CardDescription>{t("activityDesc")}</CardDescription></div>
            <div className="hidden gap-6 text-end sm:flex">
              <div><div className="text-xs text-fg-muted">{t("activeCards")}</div><div className="tabular text-lg font-semibold">{formatNumber(o.cards_active)}</div></div>
              <div><div className="text-xs text-fg-muted">{t("walletPasses")}</div><div className="tabular text-lg font-semibold">{formatNumber(o.wallet_passes)}</div></div>
            </div>
          </CardHeader>
          <CardContent>
            {hasActivity ? (
              <ActivityChart data={o.series} labels={{ earned: t("earnedSeries"), redeemed: t("redeemedSeries") }} />
            ) : (
              <div className="bg-grid-ink grid h-[260px] place-items-center rounded-xl border border-dashed border-border-strong text-center text-sm text-fg-muted"><p className="max-w-xs">{t("emptyChart")}</p></div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {doneCount < steps.length && (
            <Card className="overflow-hidden">
              <div className="relative bg-ink-900 p-5 text-white">
                <div className="absolute -end-10 -top-10 size-32 rounded-full bg-lime-300/20 blur-2xl" />
                <div className="relative flex items-center justify-between">
                  <div><h3 className="font-semibold">{t("setupTitle")}</h3><p className="mt-0.5 text-sm text-ink-300">{t("setupDesc")}</p></div>
                  <span className="tabular font-display text-3xl text-lime-300">{doneCount}/{steps.length}</span>
                </div>
                <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-lime-300 transition-all duration-700" style={{ width: `${(doneCount / steps.length) * 100}%` }} /></div>
              </div>
              <ul className="divide-y divide-border">
                {steps.map((s) => (
                  <li key={s.key}>
                    <Link href={s.href} className="group flex items-center gap-3 px-5 py-3.5 transition hover:bg-surface-muted">
                      {s.done ? <CheckCircle2 className="size-5 text-success-500" /> : <Circle className="size-5 text-ink-300" />}
                      <span className={cn("flex-1 text-sm", s.done && "text-fg-muted line-through")}>{t(s.key)}</span>
                      {!s.done && <ArrowRight className="size-4 text-fg-subtle transition group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card>
            <CardHeader><CardTitle>{t("quick")}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {quick.filter((q) => can(permissions, q.perm)).map((q) => (
                <Link key={q.key} href={q.href} className="group flex flex-col gap-3 rounded-xl border border-border p-3 transition hover:border-ink-300 hover:shadow-sm">
                  <span className="grid size-8 place-items-center rounded-lg bg-surface-sunken transition group-hover:bg-lime-300"><q.icon className="size-4" /></span>
                  <span className="text-sm font-medium">{t(q.key)}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
