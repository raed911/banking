import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatTND } from "@/lib/utils";

export default async function AdminPayments() {
  await requirePlatformAdmin();
  const t = await getTranslations("admin");
  const format = await getFormatter();
  const db = createAdminClient();
  const [{ data: payments }, { data: invoices }] = await Promise.all([
    db.from("payments").select("id, amount_millimes, method, reference, received_at, merchant:merchants(id, name)").order("received_at", { ascending: false }).limit(200),
    db.from("invoices").select("id, number, total_millimes, issued_at, merchant:merchants(id, name)").eq("status", "open").order("issued_at", { ascending: false }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title={t("payments.title")} description={t("payments.subtitle")} />
      {!!invoices?.length && (
        <Card>
          <CardHeader><CardTitle>{t("payments.openInvoices")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {invoices.map((i) => (
              <Link key={i.id} href={`/admin/merchants/${i.merchant?.id}`} className="flex items-center justify-between rounded-xl border border-warning-500/30 bg-warning-50 px-4 py-3 text-sm transition hover:shadow-sm">
                <span><span className="font-medium">{i.merchant?.name}</span><span className="block font-mono text-xs text-warning-700">{i.number} · {format.dateTime(new Date(i.issued_at), { dateStyle: "medium" })}</span></span>
                <span className="tabular font-semibold">{formatTND(i.total_millimes)}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
      <Card className="overflow-hidden">
        <CardHeader><CardTitle>{t("payments.received")}</CardTitle></CardHeader>
        <CardContent className="p-0 sm:p-0">
          {!payments?.length ? <p className="px-6 pb-6 text-sm text-fg-muted">{t("payments.empty")}</p> : (
            <ul className="divide-y divide-border">
              {payments.map((p) => (
                <li key={p.id}><Link href={`/admin/merchants/${p.merchant?.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-6 py-3 text-sm hover:bg-surface-muted sm:grid-cols-[140px_minmax(0,1fr)_120px_minmax(0,1fr)_auto]">
                  <span className="hidden text-fg-muted sm:block">{format.dateTime(new Date(p.received_at), { dateStyle: "medium" })}</span>
                  <span className="truncate font-medium">{p.merchant?.name}</span>
                  <span className="hidden text-fg-muted sm:block">{t(`merchant.methods.${p.method}`)}</span>
                  <span className="hidden truncate text-fg-muted sm:block">{p.reference}</span>
                  <span className="tabular text-end font-semibold">{formatTND(p.amount_millimes)}</span>
                </Link></li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
