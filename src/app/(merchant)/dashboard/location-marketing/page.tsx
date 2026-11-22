import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Apple, CircleCheck, Clock, EyeOff, MapPinned, Plus, RefreshCw, ShieldCheck, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/states";
import { requireMerchant } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { LocationCampaigns, type Campaign } from "./campaigns";
import { ZoneEditor } from "./zone-editor";

const TABS = ["zones", "campaigns", "how"] as const;
const HOW_ICONS = [EyeOff, Apple, Smartphone, RefreshCw, ShieldCheck];

export default async function LocationMarketingPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { merchantId, membership, permissions } = await requireMerchant("campaigns.manage");
  const t = await getTranslations("geo");
  const tab = (TABS as readonly string[]).includes((await searchParams).tab ?? "") ? ((await searchParams).tab as (typeof TABS)[number]) : "zones";
  const supabase = await createClient();
  const [{ data: locations }, { data: integ }] = await Promise.all([
    supabase.from("locations").select("id, name, address, city, latitude, longitude, geo_enabled, geo_radius_m, geo_message, is_active").eq("merchant_id", merchantId).eq("is_active", true).order("created_at"),
    createAdminClient().from("integrations").select("provider, status, merchant_id").in("provider", ["apple_wallet", "google_wallet"]).or(`merchant_id.is.null,merchant_id.eq.${merchantId}`),
  ]);
  const ready = (p: string) => (integ ?? []).some((i) => i.provider === p && i.status === "verified");

  let content: React.ReactNode = null;
  if (tab === "zones") {
    content = !locations?.length ? <EmptyState icon={<MapPinned />} title={t("zone.noLocations")} action={<Button asChild><Link href="/dashboard/locations"><Plus />{t("zone.noLocations")}</Link></Button>} />
      : <div className="space-y-6">{locations.map((l) => <ZoneEditor key={l.id} zone={l} merchantName={membership.merchant.name} canEdit={can(permissions, "locations.manage")} />)}</div>;
  } else if (tab === "campaigns") {
    const [{ data: campaigns }, { data: programs }, { data: coupons }] = await Promise.all([
      supabase.from("location_campaigns").select("*").eq("merchant_id", merchantId).order("starts_at", { ascending: false }).limit(50),
      supabase.from("loyalty_programs").select("id, name").eq("merchant_id", merchantId).eq("status", "active"),
      supabase.from("coupons").select("id, name").eq("merchant_id", merchantId).eq("status", "active"),
    ]);
    const withStats: Campaign[] = await Promise.all((campaigns ?? []).map(async (c) => ({ ...c, stats: c.status === "draft" ? null : ((await supabase.rpc("location_campaign_stats", { p_campaign_id: c.id })).data as Campaign["stats"]) })));
    content = <LocationCampaigns campaigns={withStats} locations={(locations ?? []).map((l) => ({ id: l.id, name: l.name }))} programs={programs ?? []} coupons={coupons ?? []} canEdit />;
  } else {
    content = (
      <div className="grid gap-4 md:grid-cols-2">
        {(t.raw("how.items") as { t: string; d: string }[]).map((it, i) => { const Icon = HOW_ICONS[i] ?? Clock; return (
          <Card key={it.t}><CardContent className="flex gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-ink-900 text-lime-300"><Icon className="size-5" /></span><div><h3 className="font-semibold">{it.t}</h3><p className="mt-1 text-sm leading-relaxed text-fg-muted">{it.d}</p></div></CardContent></Card>
        ); })}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-ink-900 p-6 text-white sm:p-8">
        <div className="bg-grid absolute inset-0" />
        <div className="absolute -end-16 -top-16 size-64 rounded-full border-[18px] border-lime-300/10" /><div className="absolute -end-4 -top-4 size-40 rounded-full border-[14px] border-lime-300/20" /><div className="absolute end-12 top-12 size-16 rounded-full bg-lime-300/40 blur-md" />
        <div className="relative max-w-xl">
          <PageHeader title={<span className="text-white">{t("title")}</span>} description={<span className="text-ink-300">{t("subtitle")}</span>} />
          <div className="mt-5 flex flex-wrap gap-2">
            {(["apple_wallet", "google_wallet"] as const).map((p) => (
              <span key={p} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs">
                {ready(p) ? <CircleCheck className="size-3.5 text-lime-300" /> : <Clock className="size-3.5 text-warning-500" />}
                {t(`status.${p === "apple_wallet" ? "apple" : "google"}`)} · {ready(p) ? t("status.ready") : t("status.pending")}
              </span>
            ))}
          </div>
          {!(ready("apple_wallet") && ready("google_wallet")) && <p className="mt-3 text-xs text-ink-400">{t("status.pendingHint")}</p>}
        </div>
      </div>
      <nav className="flex gap-1 border-b border-border">
        {TABS.map((k) => <Link key={k} href={`?tab=${k}`} scroll={false} className={cn("relative px-3 pb-3 pt-1 text-sm font-medium", tab === k ? "text-fg" : "text-fg-muted hover:text-fg")}>{t(`tabs.${k}`)}{tab === k && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-ink-900" />}</Link>)}
        <Badge tone="lime" className="ms-auto self-center">{(locations ?? []).filter((l) => l.geo_enabled).length} / {(locations ?? []).length}</Badge>
      </nav>
      {content}
    </div>
  );
}
