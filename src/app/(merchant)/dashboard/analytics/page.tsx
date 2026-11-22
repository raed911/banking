import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Download } from "lucide-react";
import { SimpleBarChart } from "@/components/dashboard/simple-bar-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireMerchant } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type A = {
  programs: { name: string; type: string; cards: number; earned: number; redeemed: number; visitors: number }[];
  top_customers: { id: string; name: string; visits: number }[]; locations: { name: string; visits: number }[];
  employees: { name: string; operations: number }[]; hours: { hour: number; visits: number }[]; consent_rate: number;
};

function Bars({ rows, unit, empty }: { rows: { label: string; value: number; href?: string }[]; unit: string; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="text-sm text-fg-muted">{empty}</p>;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label} className="text-sm">
          <div className="mb-1 flex justify-between gap-2">{r.href ? <Link href={r.href} className="truncate font-medium hover:underline">{r.label}</Link> : <span className="truncate font-medium">{r.label}</span>}<span className="tabular text-fg-muted">{r.value} {unit}</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-sunken"><div className="h-full rounded-full bg-lime-500" style={{ width: `${(r.value / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { merchantId, permissions } = await requireMerchant("analytics.view");
  const t = await getTranslations("analytics");
  const tp = await getTranslations("dash.overview");
  const days = [7, 30, 90, 365].includes(Number((await searchParams).days)) ? Number((await searchParams).days) : 30;
  const supabase = await createClient();
  const { data } = await supabase.rpc("merchant_analytics", { p_merchant_id: merchantId, p_days: days });
  const a = data as unknown as A;
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} actions={
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex rounded-xl bg-surface-sunken p-1">{[7, 30, 90, 365].map((d) => <Link key={d} href={`?days=${d}`} className={cn("rounded-lg px-3 py-1.5 text-sm font-medium", d === days ? "bg-surface shadow-sm" : "text-fg-muted")}>{tp("periodShort", { days: d })}</Link>)}</div>
          {can(permissions, "customers.export") && <Button asChild variant="secondary"><a href="/dashboard/customers/export" download><Download />{t("export")}</a></Button>}
        </div>
      } />
      <Card>
        <CardHeader><CardTitle>{t("programs")}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0 sm:p-0">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="border-y border-border bg-surface-muted text-xs uppercase tracking-[0.08em] text-fg-subtle"><th className="px-6 py-3 text-start font-medium">{t("programs")}</th><th className="px-4 py-3 text-end font-medium">{t("cards")}</th><th className="px-4 py-3 text-end font-medium">{t("visitors")}</th><th className="px-4 py-3 text-end font-medium">{t("earned")}</th><th className="px-6 py-3 text-end font-medium">{t("redeemed")}</th></tr></thead>
            <tbody className="divide-y divide-border">{a.programs.map((p) => <tr key={p.name}><td className="px-6 py-3 font-medium">{p.name}</td><td className="tabular px-4 py-3 text-end">{p.cards}</td><td className="tabular px-4 py-3 text-end">{p.visitors}</td><td className="tabular px-4 py-3 text-end">{p.earned}</td><td className="tabular px-6 py-3 text-end">{p.redeemed}</td></tr>)}</tbody>
          </table>
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><div><CardTitle>{t("hours")}</CardTitle><CardDescription>{t("hoursDesc")}</CardDescription></div></CardHeader><CardContent><SimpleBarChart data={a.hours} xKey="hour" yKey="visits" label={t("visits")} /></CardContent></Card>
        <Card><CardHeader><CardTitle>{t("topCustomers")}</CardTitle></CardHeader><CardContent><Bars rows={a.top_customers.map((c) => ({ label: c.name, value: c.visits, href: `/dashboard/customers/${c.id}` }))} unit={t("visits")} empty={t("empty")} /></CardContent></Card>
        <Card><CardHeader><CardTitle>{t("locations")}</CardTitle></CardHeader><CardContent><Bars rows={a.locations.map((l) => ({ label: l.name, value: l.visits }))} unit={t("visits")} empty={t("empty")} /></CardContent></Card>
        <Card><CardHeader><CardTitle>{t("employees")}</CardTitle></CardHeader><CardContent><Bars rows={a.employees.map((e) => ({ label: e.name, value: e.operations }))} unit={t("operations")} empty={t("empty")} /></CardContent></Card>
      </div>
      <Card><CardContent className="flex items-center justify-between"><span className="text-sm text-fg-muted">{t("consent")}</span><span className="font-display text-4xl">{a.consent_rate}%</span></CardContent></Card>
    </div>
  );
}
