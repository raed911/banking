import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Receipt, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/states";
import { requireMerchant } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { ReviewButton } from "./review-button";

const PAGE = 50;
const KIND_TONE = { earn: "lime", redeem: "info", adjust: "warning", expire: "neutral", reverse: "danger" } as const;

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<{ tab?: string; page?: string }> }) {
  const { merchantId, permissions } = await requireMerchant("transactions.view");
  const t = await getTranslations("tx");
  const tk = await getTranslations("public.card.kinds");
  const format = await getFormatter();
  const sp = await searchParams;
  const tab = sp.tab === "fraud" ? "fraud" : "all";
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  const { count: openFraud } = await supabase.from("fraud_signals").select("id", { count: "exact", head: true }).eq("merchant_id", merchantId).is("reviewed_at", null);

  const tabs = (
    <div className="flex gap-1 rounded-xl bg-surface-sunken p-1">
      {(["all", "fraud"] as const).map((k) => (
        <Link key={k} href={`?tab=${k}`} className={cn("flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium", tab === k ? "bg-surface shadow-sm" : "text-fg-muted")}>
          {t(k)}{k === "fraud" && !!openFraud && <span className="rounded-full bg-danger-500 px-1.5 text-xs text-white">{openFraud}</span>}
        </Link>
      ))}
    </div>
  );

  if (tab === "fraud") {
    const { data: signals } = await supabase.from("fraud_signals").select("id, rule, severity, details, created_at, reviewed_at, customer:customers(id, first_name, last_name)").eq("merchant_id", merchantId).order("reviewed_at", { nullsFirst: true }).order("created_at", { ascending: false }).limit(100);
    return (
      <div className="space-y-6">
        <PageHeader title={t("title")} description={t("subtitle")} actions={tabs} />
        {!signals?.length ? <EmptyState icon={<ShieldCheck />} title={t("fraudEmpty")} /> : (
          <Card className="divide-y divide-border overflow-hidden">
            {signals.map((s) => (
              <div key={s.id} className={cn("flex flex-wrap items-center gap-3 px-5 py-4", s.reviewed_at && "opacity-60")}>
                <Badge tone={s.severity === "high" ? "danger" : s.severity === "medium" ? "warning" : "neutral"} dot>{t(`severity.${s.severity as "low"}`)}</Badge>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{t.has(`rules.${s.rule}`) ? t(`rules.${s.rule}` as "rules.cooldown") : s.rule}</div>
                  <div className="text-xs text-fg-muted">{s.customer ? <Link href={`/dashboard/customers/${s.customer.id}`} className="underline-offset-2 hover:underline">{s.customer.first_name} {s.customer.last_name ?? ""}</Link> : "—"} · {format.dateTime(new Date(s.created_at), { dateStyle: "medium", timeStyle: "short" })}</div>
                </div>
                {s.reviewed_at ? <span className="text-xs text-fg-muted">{t("reviewed")}</span> : can(permissions, "cards.adjust") && <ReviewButton id={s.id} label={t("review")} />}
              </div>
            ))}
          </Card>
        )}
      </div>
    );
  }

  const { data: rows, count } = await supabase.from("loyalty_transactions")
    .select("id, kind, amount, created_at, source, note, customer:customers(id, first_name, last_name), program:loyalty_programs(name)", { count: "exact" })
    .eq("merchant_id", merchantId).order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} actions={tabs} />
      {!rows?.length ? <EmptyState icon={<Receipt />} title={t("empty")} /> : (
        <Card className="overflow-hidden">
          <div className="hidden grid-cols-[150px_minmax(0,1.5fr)_minmax(0,1fr)_120px_110px_80px] gap-4 border-b border-border bg-surface-muted px-5 py-3 text-xs font-medium uppercase tracking-[0.08em] text-fg-subtle md:grid">
            <span>{t("cols.date")}</span><span>{t("cols.customer")}</span><span>{t("cols.program")}</span><span>{t("cols.type")}</span><span>{t("cols.by")}</span><span className="text-end">{t("cols.amount")}</span>
          </div>
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-3 text-sm md:grid-cols-[150px_minmax(0,1.5fr)_minmax(0,1fr)_120px_110px_80px]">
                <span className="order-3 text-xs text-fg-muted md:order-none md:text-sm">{format.dateTime(new Date(r.created_at), { dateStyle: "short", timeStyle: "short" })}</span>
                <span className="truncate font-medium">{r.customer ? <Link href={`/dashboard/customers/${r.customer.id}`} className="hover:underline">{r.customer.first_name} {r.customer.last_name ?? ""}</Link> : "—"}</span>
                <span className="hidden truncate text-fg-muted md:block">{r.program?.name}</span>
                <span className="hidden md:block"><Badge tone={KIND_TONE[r.kind]}>{tk(r.kind)}</Badge></span>
                <span className="hidden text-fg-muted md:block">{t.has(`sources.${r.source}`) ? t(`sources.${r.source}` as "sources.scanner") : r.source}</span>
                <span className={cn("tabular text-end font-semibold", r.amount > 0 ? "text-success-700" : "text-fg-muted")}>{r.amount > 0 ? `+${r.amount}` : r.amount}</span>
              </li>
            ))}
          </ul>
          {pages > 1 && <div className="flex justify-center gap-2 border-t border-border p-3 text-sm">{page > 1 && <Link href={`?page=${page - 1}`} className="rounded-lg px-3 py-1 hover:bg-surface-sunken">←</Link>}<span className="px-3 py-1 text-fg-muted">{page} / {pages}</span>{page < pages && <Link href={`?page=${page + 1}`} className="rounded-lg px-3 py-1 hover:bg-surface-sunken">→</Link>}</div>}
        </Card>
      )}
    </div>
  );
}
