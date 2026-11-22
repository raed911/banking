import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SUB_TONE } from "@/lib/admin-format";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { formatTND } from "@/lib/utils";
import { AccountControls, PaymentForm } from "./merchant-client";

export default async function AdminMerchant({ params }: { params: Promise<{ id: string }> }) {
  await requirePlatformAdmin();
  const { id } = await params;
  const t = await getTranslations("admin");
  const format = await getFormatter();
  const db = createAdminClient(); // read-only here; every mutation goes through admin-checked RPCs
  const { data: m } = await db.from("merchants").select("*").eq("id", id).maybeSingle();
  if (!m) notFound();
  const [{ data: sub }, { data: prices }, { data: invoices }, { data: payments }, { data: members }, counts] = await Promise.all([
    db.from("subscriptions").select("*, price:plan_prices(period, amount_millimes), plan:plans(name)").eq("merchant_id", id).maybeSingle(),
    db.from("plan_prices").select("id, period, interval_months, amount_millimes").eq("is_active", true).order("interval_months"),
    db.from("invoices").select("id, number, status, total_millimes, issued_at, paid_at, period_end, line_items").eq("merchant_id", id).order("issued_at", { ascending: false }).limit(20),
    db.from("payments").select("id, amount_millimes, method, reference, received_at").eq("merchant_id", id).order("received_at", { ascending: false }).limit(20),
    db.from("merchant_members").select("user_id, status, role:roles(name)").eq("merchant_id", id),
    Promise.all(["customers", "loyalty_cards", "loyalty_programs", "locations"].map((tbl) => db.from(tbl as "customers").select("id", { count: "exact", head: true }).eq("merchant_id", id))),
  ]);
  const users = await Promise.all((members ?? []).map(async (mm) => ({ ...mm, email: (await db.auth.admin.getUserById(mm.user_id)).data.user?.email ?? "?" })));
  const [customers, cards, programs, locations] = counts.map((c) => c.count ?? 0);
  const until = sub?.status === "trialing" ? sub.trial_ends_at : sub?.current_period_end;
  const openInvoices = (invoices ?? []).filter((i) => i.status === "open");

  return (
    <div className="space-y-6">
      <Link href="/admin/merchants" className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg"><ArrowLeft className="size-4 rtl:rotate-180" />{t("merchant.back")}</Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={m.name} size={56} className="text-base" />
          <div>
            <div className="flex items-center gap-2"><h1 className="text-2xl font-semibold tracking-[-0.03em]">{m.name}</h1><Badge tone={m.status === "active" ? "success" : "danger"} dot>{t(`merchant.merchantStatus.${m.status}`)}</Badge></div>
            <p className="text-sm text-fg-muted">{[m.city, m.phone, m.industry].filter(Boolean).join(" · ")} · {format.dateTime(new Date(m.created_at), { dateStyle: "medium" })}</p>
            {m.suspended_reason && <p className="mt-1 text-sm text-danger-700">{m.suspended_reason}</p>}
          </div>
        </div>
        <AccountControls merchantId={m.id} status={m.status} canExtend={sub?.status === "trialing" || sub?.status === "expired"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Card><CardContent className="p-5 sm:p-5"><div className="text-xs text-fg-muted">{t("merchant.subscription")}</div><div className="mt-2">{sub ? <Badge tone={SUB_TONE[sub.status]} dot>{t(`sub.${sub.status}`)}</Badge> : "—"}</div><div className="mt-2 text-sm">{sub?.price ? `${t(`period.${sub.price.period}`)} · ${formatTND(sub.price.amount_millimes)}` : sub?.plan?.name}</div></CardContent></Card>
            <Card><CardContent className="p-5 sm:p-5"><div className="text-xs text-fg-muted">{sub?.status === "trialing" ? t("merchant.trialUntil") : t("merchant.until")}</div><div className="mt-2 text-lg font-semibold">{until ? format.dateTime(new Date(until), { dateStyle: "long" }) : "—"}</div></CardContent></Card>
            <Card><CardContent className="p-5 sm:p-5"><div className="text-xs text-fg-muted">{t("merchant.locations")}</div><div className="mt-2 text-lg font-semibold">{locations} / {sub?.quantity ?? 1}</div></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle>{t("merchant.stats")}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-3 gap-3 text-center">
              {[[t("merchant.programs"), programs], [t("merchants.cols.customers"), customers], [t("overview.cards"), cards]].map(([k, v]) => <div key={String(k)} className="rounded-xl bg-surface-muted p-4"><div className="tabular text-2xl font-semibold">{v}</div><div className="text-xs text-fg-muted">{k}</div></div>)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t("merchant.invoices")}</CardTitle></CardHeader>
            <CardContent className="p-0 sm:p-0">
              {!invoices?.length ? <p className="px-6 pb-6 text-sm text-fg-muted">{t("merchant.noInvoices")}</p> : (
                <ul className="divide-y divide-border">{invoices.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 px-6 py-3 text-sm">
                    <span><span className="font-mono font-medium">{i.number}</span><span className="block text-xs text-fg-muted">{format.dateTime(new Date(i.issued_at), { dateStyle: "medium" })}</span></span>
                    <Badge tone={i.status === "paid" ? "success" : i.status === "open" ? "warning" : "neutral"}>{t(`merchant.invoiceStatus.${i.status}`)}</Badge>
                    <span className="tabular font-semibold">{formatTND(i.total_millimes)}</span>
                  </li>))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t("merchant.team")}</CardTitle></CardHeader>
            <CardContent className="space-y-2">{users.map((u) => <div key={u.user_id} className="flex items-center justify-between text-sm"><span className="truncate">{u.email}</span><span className="text-fg-muted">{(u.role as { name: string } | null)?.name}</span></div>)}</CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <PaymentForm merchantId={m.id} prices={prices ?? []} quantity={sub?.quantity ?? 1} openInvoices={openInvoices.map((i) => ({ id: i.id, number: i.number, total: i.total_millimes / 1000 }))} />
          <Card>
            <CardHeader><CardTitle>{t("merchant.payments")}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {!payments?.length ? <p className="text-sm text-fg-muted">{t("merchant.noPayments")}</p> : payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl bg-surface-muted px-3 py-2.5 text-sm">
                  <span><span className="font-medium">{t(`merchant.methods.${p.method}`)}</span>{p.reference && <span className="text-fg-muted"> · {p.reference}</span>}<span className="block text-xs text-fg-muted">{format.dateTime(new Date(p.received_at), { dateStyle: "medium" })}</span></span>
                  <span className="tabular font-semibold">{formatTND(p.amount_millimes)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
