import { getFormatter, getTranslations } from "next-intl/server";
import { Receipt, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireMerchant } from "@/lib/auth/session";
import { getSubscription } from "@/lib/merchant";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { formatTND } from "@/lib/utils";
import { PlanPicker } from "./plan-picker";

export default async function BillingPage() {
  const { merchantId } = await requireMerchant("billing.manage");
  const t = await getTranslations("billing");
  const format = await getFormatter();
  const supabase = await createClient();
  const [sub, { data: prices }, { data: invoices }, { data: settings }] = await Promise.all([
    getSubscription(merchantId),
    supabase.from("plan_prices").select("id, period, interval_months, amount_millimes, label, badge").eq("is_active", true).order("interval_months"),
    supabase.from("invoices").select("id, number, status, total_millimes, issued_at, due_at, paid_at, period_end, line_items").eq("merchant_id", merchantId).order("issued_at", { ascending: false }),
    createAdminClient().from("platform_settings").select("value").eq("key", "billing").maybeSingle(),
  ]);
  const open = invoices?.find((i) => i.status === "open");
  const instructions = (settings?.value as { payment_instructions?: string } | null)?.payment_instructions;
  const until = sub?.status === "trialing" ? sub.trial_ends_at : sub?.current_period_end;
  const tone = { trialing: "lime", active: "success", past_due: "warning", expired: "danger", canceled: "neutral" } as const;

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <Card className="overflow-hidden">
        <div className="relative flex flex-col gap-4 bg-ink-900 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
          <div className="bg-grid absolute inset-0 opacity-60" />
          <div className="relative">
            <div className="text-xs uppercase tracking-[0.14em] text-ink-400">{t("current")}</div>
            <div className="mt-2 flex items-center gap-3"><span className="font-display text-4xl">PRO</span>{sub && <Badge tone={tone[sub.status]} dot>{t(`status.${sub.status}`)}</Badge>}</div>
          </div>
          <div className="relative text-sm text-ink-300 sm:text-end">
            {until && <div className="text-base font-medium text-white">{t(sub?.status === "trialing" ? "trialUntil" : "until", { date: format.dateTime(new Date(until), { dateStyle: "long" }) })}</div>}
            <div>{t("locations", { count: sub?.quantity ?? 1 })}</div>
          </div>
        </div>
      </Card>

      {open && (
        <Card className="border-warning-500/40">
          <CardHeader><div className="flex items-center gap-2"><Receipt className="size-5 text-warning-700" /><CardTitle>{t("pending")}</CardTitle></div></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-fg-muted">{t("pendingDesc")}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-surface-muted p-4"><div className="text-xs text-fg-muted">{t("invoiceNo")}</div><div className="mt-1 font-mono font-semibold">{open.number}</div></div>
              <div className="rounded-xl bg-surface-muted p-4"><div className="text-xs text-fg-muted">{t("amount")}</div><div className="mt-1 text-lg font-semibold tabular">{formatTND(open.total_millimes)}</div></div>
              <div className="rounded-xl bg-surface-muted p-4"><div className="text-xs text-fg-muted">{open.due_at ? t("due", { date: format.dateTime(new Date(open.due_at), { dateStyle: "medium" }) }) : ""}</div></div>
            </div>
            {instructions && <div className="flex gap-3 rounded-xl border border-border p-4 text-sm"><Wallet className="size-5 shrink-0 text-fg-muted" /><div><div className="font-medium">{t("instructions")}</div><p className="mt-1 text-fg-muted">{instructions}</p></div></div>}
          </CardContent>
        </Card>
      )}

      <PlanPicker prices={prices ?? []} quantity={sub?.quantity ?? 1} />

      <Card>
        <CardHeader><CardTitle>{t("invoices")}</CardTitle></CardHeader>
        <CardContent className="p-0 sm:p-0">
          {!invoices?.length ? <p className="px-6 pb-6 text-sm text-fg-muted">{t("noInvoices")}</p> : (
            <ul className="divide-y divide-border">
              {invoices.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 px-6 py-3 text-sm">
                  <span><span className="font-mono font-medium">{i.number}</span><span className="block text-xs text-fg-muted">{format.dateTime(new Date(i.issued_at), { dateStyle: "medium" })}</span></span>
                  <Badge tone={i.status === "paid" ? "success" : i.status === "open" ? "warning" : "neutral"}>{t(`invoiceStatus.${i.status}`)}</Badge>
                  <span className="tabular font-semibold">{formatTND(i.total_millimes)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
