import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Bell, CheckCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/states";
import { markAllRead } from "@/features/notifications/actions";
import { requireMerchant } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function NotificationsPage() {
  const { merchantId } = await requireMerchant();
  const t = await getTranslations("notif");
  const format = await getFormatter();
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("id, title, body, link, read_at, created_at").eq("merchant_id", merchantId).order("created_at", { ascending: false }).limit(100);
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} actions={data?.some((n) => !n.read_at) && <form action={markAllRead}><Button variant="secondary"><CheckCheck />{t("markAll")}</Button></form>} />
      {!data?.length ? <EmptyState icon={<Bell />} title={t("empty")} /> : (
        <Card className="divide-y divide-border overflow-hidden">
          {data.map((n) => {
            const body = (<><span className="flex items-center gap-2 font-medium">{n.title}{!n.read_at && <Badge tone="lime">{t("new")}</Badge>}</span>{n.body && <span className="block text-sm text-fg-muted">{n.body}</span>}<span className="block text-xs text-fg-subtle">{format.relativeTime(new Date(n.created_at))}</span></>);
            return n.link && n.link.startsWith("/") ? <Link key={n.id} href={n.link} className="block px-5 py-4 hover:bg-surface-muted">{body}</Link> : <div key={n.id} className="px-5 py-4">{body}</div>;
          })}
        </Card>
      )}
    </div>
  );
}
