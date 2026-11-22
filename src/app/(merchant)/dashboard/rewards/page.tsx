import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/states";
import { requireMerchant } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function RewardsPage() {
  const { merchantId } = await requireMerchant();
  const t = await getTranslations("rewardsPage");
  const tu = await getTranslations("programs.units");
  const format = await getFormatter();
  const supabase = await createClient();
  const [{ data: rewards }, { data: recent }] = await Promise.all([
    supabase.from("rewards").select("id, name, cost, stock, is_active, program:loyalty_programs(id, name, type), reward_redemptions(count)").eq("merchant_id", merchantId).order("cost"),
    supabase.from("reward_redemptions").select("id, code, redeemed_at, reward:rewards(name), customer:customers(id, first_name, last_name)").eq("merchant_id", merchantId).order("created_at", { ascending: false }).limit(12),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      {!rewards?.length ? <EmptyState icon={<Gift />} title={t("empty")} action={<Button asChild><Link href="/dashboard/programs">{t("manage")}</Link></Button>} /> : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-3 sm:grid-cols-2">
            {rewards.map((r) => (
              <Link key={r.id} href={`/dashboard/programs/${r.program?.id}?tab=rewards`} className="group flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 transition hover:shadow-md">
                <span className="grid size-12 place-items-center rounded-2xl bg-lime-100 text-lime-800 transition group-hover:bg-lime-300"><Gift className="size-5" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{r.name}</span><span className="block truncate text-xs text-fg-muted">{r.program?.name} · {r.cost} {r.program ? tu(r.program.type) : ""}</span><span className="mt-1 block text-xs font-medium">{t("redeemed", { count: (r.reward_redemptions as unknown as { count: number }[])[0]?.count ?? 0 })}</span></span>
              </Link>
            ))}
          </div>
          <Card className="h-fit">
            <CardHeader><CardTitle>{t("recent")}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {!recent?.length ? <p className="text-sm text-fg-muted">{t("noRecent")}</p> : recent.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface-muted px-3 py-2.5 text-sm">
                  <span className="min-w-0"><span className="block truncate font-medium">{r.reward?.name}</span><span className="block truncate text-xs text-fg-muted">{r.customer?.first_name} · {r.redeemed_at && format.relativeTime(new Date(r.redeemed_at))}</span></span>
                  <span className="font-mono text-xs text-fg-muted">{r.code}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
