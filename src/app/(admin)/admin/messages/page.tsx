import { getFormatter, getTranslations } from "next-intl/server";
import { Check, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/states";
import { markMessageHandled } from "@/features/admin/actions";
import { createClient } from "@/lib/supabase/server";

export default async function AdminMessages() {
  const t = await getTranslations("admin.messages");
  const format = await getFormatter();
  const supabase = await createClient();
  const { data } = await supabase.from("contact_messages").select("*").order("handled_at", { nullsFirst: true }).order("created_at", { ascending: false }).limit(200);
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} />
      {!data?.length ? <EmptyState icon={<Inbox />} title={t("empty")} /> : (
        <Card className="divide-y divide-border overflow-hidden">
          {data.map((m) => (
            <div key={m.id} className={m.handled_at ? "p-5 opacity-60" : "p-5"}>
              <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{m.name}</span>{m.business && <Badge>{m.business}</Badge>}<span className="text-sm text-fg-muted" dir="ltr">{m.email}{m.phone ? ` · ${m.phone}` : ""}</span><span className="ms-auto text-xs text-fg-subtle">{format.dateTime(new Date(m.created_at), { dateStyle: "medium", timeStyle: "short" })}</span></div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-fg-muted">{m.message}</p>
              <div className="mt-3">{m.handled_at ? <Badge tone="success">{t("handled")}</Badge> : <form action={markMessageHandled.bind(null, m.id)}><Button size="sm" variant="secondary"><Check />{t("markHandled")}</Button></form>}</div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
