import { getFormatter, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminLogs() {
  await requirePlatformAdmin();
  const t = await getTranslations("admin.logs");
  const format = await getFormatter();
  const db = createAdminClient();
  const [{ data: audit }, { data: system }] = await Promise.all([
    db.from("audit_logs").select("id, action, actor_type, entity_type, details, created_at, merchant:merchants(name)").order("created_at", { ascending: false }).limit(150),
    db.from("system_logs").select("id, level, source, message, context, created_at").order("created_at", { ascending: false }).limit(100),
  ]);
  const tone = { error: "danger", warn: "warning", info: "info", debug: "neutral" } as const;
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader><CardTitle>{t("audit")}</CardTitle></CardHeader>
          <CardContent className="p-0 sm:p-0">
            {!audit?.length ? <p className="px-6 pb-6 text-sm text-fg-muted">{t("empty")}</p> : (
              <ul className="max-h-[70vh] divide-y divide-border overflow-y-auto">
                {audit.map((a) => (
                  <li key={a.id} className="px-6 py-3 text-sm">
                    <div className="flex items-center justify-between gap-2"><span className="font-mono text-xs font-semibold">{a.action}</span><span className="text-xs text-fg-subtle">{format.dateTime(new Date(a.created_at), { dateStyle: "short", timeStyle: "short" })}</span></div>
                    <div className="mt-0.5 truncate text-xs text-fg-muted">{a.merchant?.name ?? "—"} · {a.actor_type}{a.details && Object.keys(a.details as object).length ? ` · ${JSON.stringify(a.details).slice(0, 120)}` : ""}</div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader><CardTitle>{t("system")}</CardTitle></CardHeader>
          <CardContent className="p-0 sm:p-0">
            {!system?.length ? <p className="px-6 pb-6 text-sm text-fg-muted">{t("empty")}</p> : (
              <ul className="max-h-[70vh] divide-y divide-border overflow-y-auto">
                {system.map((s) => (
                  <li key={s.id} className="px-6 py-3 text-sm">
                    <div className="flex items-center gap-2"><Badge tone={tone[s.level as keyof typeof tone] ?? "neutral"}>{s.level}</Badge><span className="font-mono text-xs">{s.source}</span><span className="ms-auto text-xs text-fg-subtle">{format.dateTime(new Date(s.created_at), { dateStyle: "short", timeStyle: "short" })}</span></div>
                    <div className="mt-1 text-xs text-fg-muted">{s.message} {s.context && Object.keys(s.context as object).length ? JSON.stringify(s.context).slice(0, 160) : ""}</div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
