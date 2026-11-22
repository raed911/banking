import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Radar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/states";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLocationMarketing() {
  const t = await getTranslations("admin.geo");
  const format = await getFormatter();
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_location_marketing");
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      {!data?.length ? <EmptyState icon={<Radar />} title={t("empty")} /> : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="border-b border-border bg-surface-muted text-xs uppercase tracking-[0.08em] text-fg-subtle">{[t("merchant"), t("zones"), t("campaigns"), t("active"), t("passes"), t("last")].map((h, i) => <th key={h} className={i ? "px-4 py-3 text-end font-medium" : "px-6 py-3 text-start font-medium"}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-border">
              {data.map((r) => (
                <tr key={r.merchant_id}>
                  <td className="px-6 py-3 font-medium"><Link href={`/admin/merchants/${r.merchant_id}`} className="hover:underline">{r.merchant}</Link></td>
                  <td className="tabular px-4 py-3 text-end">{r.geo_locations}</td>
                  <td className="tabular px-4 py-3 text-end">{r.campaigns_total}</td>
                  <td className="px-4 py-3 text-end">{r.campaigns_active > 0 ? <Badge tone="success" dot>{r.campaigns_active}</Badge> : "0"}</td>
                  <td className="tabular px-4 py-3 text-end">{r.wallet_passes}</td>
                  <td className="px-4 py-3 text-end text-fg-muted">{r.last_campaign_at ? format.relativeTime(new Date(r.last_campaign_at)) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
