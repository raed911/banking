import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AlertTriangle, Banknote, Building2, CreditCard, FileClock, Sparkles, TrendingUp, Users } from "lucide-react";
import { SignupsChart } from "@/components/admin/signups-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { createClient } from "@/lib/supabase/server";
import { formatNumber, formatTND } from "@/lib/utils";

type Overview = {
  merchants_total: number; merchants_active: number; merchants_trialing: number; merchants_expired: number; merchants_suspended: number; merchants_new: number;
  customers_total: number; cards_total: number; wallet_passes: number; transactions_period: number; mrr_millimes: number; revenue_period_millimes: number;
  revenue_month_millimes: number; expiring_soon: number; open_invoices: number; signups: { day: string; merchants: number; revenue: number }[];
};

export default async function AdminOverview() {
  const t = await getTranslations("admin.overview");
  const supabase = await createClient();
  const { data } = await supabase.rpc("platform_overview", { p_days: 30 });
  const o = data as unknown as Overview;
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard highlight label={t("mrr")} value={formatTND(o.mrr_millimes)} icon={<TrendingUp />}><p className="mt-3 text-xs text-ink-400">{t("arr")} · <span className="tabular font-semibold text-white">{formatTND(o.mrr_millimes * 12)}</span></p></StatCard>
        <StatCard label={t("merchants")} value={formatNumber(o.merchants_total)} icon={<Building2 />}><p className="mt-3 text-xs text-fg-muted">+{o.merchants_new} · {t("newMerchants")}</p></StatCard>
        <StatCard label={t("active")} value={formatNumber(o.merchants_active)} icon={<Sparkles />}><p className="mt-3 text-xs text-fg-muted">{o.merchants_trialing} {t("trialing").toLowerCase()} · {o.merchants_expired} {t("expired").toLowerCase()}</p></StatCard>
        <StatCard label={t("revenueMonth")} value={formatTND(o.revenue_month_millimes)} icon={<Banknote />}><p className="mt-3 text-xs text-fg-muted">{t("revenuePeriod")} · {formatTND(o.revenue_period_millimes)}</p></StatCard>
      </section>
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader><div><CardTitle>{t("signups")}</CardTitle><CardDescription>{t("signupsDesc")}</CardDescription></div></CardHeader>
          <CardContent><SignupsChart data={o.signups} label={t("merchants").toLowerCase()} /></CardContent>
        </Card>
        <div className="grid gap-3">
          {[
            { label: t("customers"), value: formatNumber(o.customers_total), icon: Users },
            { label: t("cards"), value: formatNumber(o.cards_total), icon: CreditCard },
            { label: t("transactions"), value: formatNumber(o.transactions_period), icon: TrendingUp },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
              <span className="grid size-10 place-items-center rounded-xl bg-surface-sunken"><s.icon className="size-5" /></span>
              <span className="flex-1 text-sm text-fg-muted">{s.label}</span><span className="tabular text-xl font-semibold">{s.value}</span>
            </div>
          ))}
          <Link href="/admin/merchants?status=expired" className="flex items-center gap-4 rounded-2xl border border-warning-500/30 bg-warning-50 p-4 text-warning-700">
            <AlertTriangle className="size-5" /><span className="flex-1 text-sm font-medium">{t("expiring")}</span><span className="tabular text-xl font-semibold">{o.expiring_soon}</span>
          </Link>
          <Link href="/admin/payments" className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
            <FileClock className="size-5" /><span className="flex-1 text-sm font-medium">{t("openInvoices")}</span><span className="tabular text-xl font-semibold">{o.open_invoices}</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
