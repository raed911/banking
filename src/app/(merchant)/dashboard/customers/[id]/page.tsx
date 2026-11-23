import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireMerchant } from "@/lib/auth/session";
import { publicEnv } from "@/lib/env";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { CardActions, DeleteCustomer, EditCustomer, IssueCard, ReverseButton } from "./profile-client";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { merchantId, permissions } = await requireMerchant("customers.view");
  const t = await getTranslations("customers");
  const tk = await getTranslations("public.card.kinds");
  const format = await getFormatter();
  const supabase = await createClient();
  const { data: c } = await supabase.from("customers").select("*").eq("id", id).eq("merchant_id", merchantId).is("deleted_at", null).maybeSingle();
  if (!c) notFound();
  const [{ data: cards }, { data: tx }, { data: programs }, { data: couponsUsed }] = await Promise.all([
    supabase.from("loyalty_cards").select("id, serial, public_token, balance, lifetime_earned, status, program:loyalty_programs(id, name, type, stamps_required, points_per_unit)").eq("customer_id", id).neq("status", "archived").order("created_at"),
    supabase.from("loyalty_transactions").select("id, kind, amount, balance_after, created_at, note, source, reversed_transaction_id, program:loyalty_programs(name)").eq("customer_id", id).order("created_at", { ascending: false }).limit(50),
    supabase.from("loyalty_programs").select("id, name").eq("merchant_id", merchantId).eq("status", "active"),
    supabase.from("coupon_redemptions").select("id, created_at, coupon:coupons(name, code)").eq("customer_id", id).order("created_at", { ascending: false }).limit(20),
  ]);
  const reversed = new Set((tx ?? []).map((x) => x.reversed_transaction_id).filter(Boolean));
  const name = `${c.first_name} ${c.last_name ?? ""}`.trim();
  const available = (programs ?? []).filter((p) => !(cards ?? []).some((k) => k.program?.id === p.id));
  const manage = can(permissions, "customers.manage");
  const adjustPerm = can(permissions, "cards.adjust");

  return (
    <div className="space-y-6">
      <Link href="/dashboard/customers" className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg"><ArrowLeft className="size-4 rtl:rotate-180" />{t("profile.back")}</Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={name} size={56} className="text-base" />
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.03em]">{name}</h1>
            <p className="text-sm text-fg-muted">{t("profile.since")} {format.dateTime(new Date(c.created_at), { dateStyle: "long" })}</p>
          </div>
        </div>
        <div className="flex gap-2">{manage && <EditCustomer customer={c} />}{manage && <DeleteCustomer id={c.id} />}</div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>{t("profile.cards")}</CardTitle>{manage && available.length > 0 && <IssueCard customerId={c.id} programs={available} />}</CardHeader>
            <CardContent className="space-y-3">
              {!cards?.length ? <p className="text-sm text-fg-muted">{t("profile.noCards")}</p> : cards.map((k) => (
                <div key={k.id} className="flex flex-col gap-4 rounded-2xl border border-border p-4 sm:flex-row sm:items-center">
                  <div className="flex flex-1 items-center gap-4">
                    <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-ink-900 font-display text-2xl text-lime-300">{k.balance}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2"><span className="truncate font-semibold">{k.program?.name}</span>{k.status === "blocked" && <Badge tone="danger">{t("profile.blocked")}</Badge>}</div>
                      <div className="text-xs text-fg-muted">{k.program?.type !== "points" ? `${k.balance} / ${k.program?.stamps_required}` : `${k.balance} pts`} · {t("profile.lifetime")} {k.lifetime_earned} · <span className="font-mono">{k.serial}</span></div>
                      {k.program?.type !== "points" && <div className="mt-2 flex gap-1">{Array.from({ length: k.program?.stamps_required ?? 10 }, (_, i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < k.balance ? "bg-lime-400" : "bg-surface-sunken")} />)}</div>}
                    </div>
                  </div>
                  <CardActions customerId={c.id} card={{ id: k.id, status: k.status, type: k.program?.type ?? "stamps", pointsPerUnit: k.program?.points_per_unit ?? null }}
                    cardUrl={`${publicEnv.NEXT_PUBLIC_APP_URL}/c/${k.public_token}`} canEarn={can(permissions, "cards.earn")} canAdjust={adjustPerm} canCoupon={can(permissions, "coupons.redeem")} />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t("profile.history")}</CardTitle></CardHeader>
            <CardContent className="p-0 sm:p-0">
              {!tx?.length ? <p className="px-6 pb-6 text-sm text-fg-muted">{(await getTranslations("public.card"))("noHistory")}</p> : (
                <ul className="divide-y divide-border">
                  {tx.map((x) => (
                    <li key={x.id} className="flex items-center gap-3 px-5 py-3 text-sm sm:px-6">
                      <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg text-xs font-bold", x.amount > 0 ? "bg-lime-100 text-lime-800" : "bg-surface-sunken text-fg-muted")}>{x.amount > 0 ? "+" : "−"}</span>
                      <span className="min-w-0 flex-1"><span className="block font-medium">{tk(x.kind)} · {x.program?.name}</span><span className="block truncate text-xs text-fg-muted">{format.dateTime(new Date(x.created_at), { dateStyle: "medium", timeStyle: "short" })}{x.note ? ` · ${x.note}` : ""}</span></span>
                      <span className="tabular font-semibold">{x.amount > 0 ? `+${x.amount}` : x.amount}</span>
                      {adjustPerm && x.kind !== "reverse" && !reversed.has(x.id) ? <ReverseButton transactionId={x.id} /> : <span className="w-16" />}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
        <Card className="h-fit">
          <CardHeader><CardTitle>{t("profile.details")}</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              {[[t("form.phone"), c.phone], [t("form.email"), c.email], [t("form.birthday"), c.birthday && format.dateTime(new Date(`${c.birthday}T12:00:00`), { day: "numeric", month: "long" })], [t("profile.visits"), String(c.total_visits)], [t("cols.lastVisit"), c.last_visit_at ? format.relativeTime(new Date(c.last_visit_at)) : t("never")]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4"><dt className="text-fg-muted">{k}</dt><dd className="truncate text-end font-medium" dir="auto">{v || "—"}</dd></div>
              ))}
            </dl>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <Badge tone={c.marketing_consent ? "success" : "neutral"}>{c.marketing_consent ? t("profile.consentYes") : t("profile.consentNo")}</Badge>
              {c.tags.map((tag) => <Badge key={tag} tone="lime">{tag}</Badge>)}
            </div>
            {c.notes && <p className="mt-4 whitespace-pre-wrap rounded-xl bg-surface-muted p-3 text-sm text-fg-muted">{c.notes}</p>}
            {!!couponsUsed?.length && (
              <div className="mt-5">
                <div className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-fg-subtle">{t("profile.couponsUsed")}</div>
                <ul className="space-y-1.5">{couponsUsed.map((r) => <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface-muted px-3 py-2 text-sm"><span className="font-mono text-xs font-semibold" dir="ltr">{r.coupon?.code}</span><span className="text-xs text-fg-muted">{format.dateTime(new Date(r.created_at), { dateStyle: "medium" })}</span></li>)}</ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
