"use client";
import { useActionState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Cake, HeartHandshake } from "lucide-react";
import { saveAutomation } from "@/features/campaigns/automations";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ActionForm } from "@/components/forms/action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormAlert } from "@/components/forms/form-alert";

export type Automation = { kind: "winback" | "birthday"; enabled: boolean; channel: string; inactive_days: number; cooldown_days: number; message: string; coupon_id: string | null; total_sent: number; last_run_at: string | null } | undefined;
const sel = "h-10 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm";

function AutomationCard({ kind, a, coupons, connected }: { kind: "winback" | "birthday"; a: Automation; coupons: { id: string; name: string }[]; connected: { email: boolean; wallet: boolean } }) {
  const t = useTranslations("auto");
  const tc = useTranslations("camp.channels");
  const format = useFormatter();
  const [state, action] = useActionState(saveAutomation.bind(null, kind), null);
  const Icon = kind === "winback" ? HeartHandshake : Cake;
  return (
    <Card className="overflow-hidden">
      <ActionForm action={action}>
        <div className="flex items-start gap-4 border-b border-border p-5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-lime-300 text-ink-900"><Icon className="size-6" /></span>
          <div className="min-w-0 flex-1"><h3 className="font-semibold">{t(`${kind}.title`)}</h3><p className="text-sm text-fg-muted">{t(`${kind}.desc`)}</p></div>
          <Switch name="enabled" defaultChecked={a?.enabled ?? false} aria-label={t("enabled")} />
        </div>
        <div className="space-y-4 p-5">
          <FormAlert>{state?.error ? t("error") : null}</FormAlert>
          <FormAlert tone="success">{state?.ok ? t("saved") : null}</FormAlert>
          {kind === "winback" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("inactiveDays")} htmlFor={`${kind}-days`}><Input id={`${kind}-days`} name="inactive_days" type="number" min={7} max={365} defaultValue={a?.inactive_days ?? 30} /></Field>
              <Field label={t("cooldownDays")} htmlFor={`${kind}-cool`}><Input id={`${kind}-cool`} name="cooldown_days" type="number" min={7} max={365} defaultValue={a?.cooldown_days ?? 30} /></Field>
            </div>
          )}
          <Field label={t("message")} htmlFor={`${kind}-msg`}><Textarea id={`${kind}-msg`} name="message" required minLength={3} maxLength={300} defaultValue={a?.message ?? t(`${kind}.default`)} className="min-h-20" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("channel")} htmlFor={`${kind}-ch`}><select id={`${kind}-ch`} name="channel" className={sel} defaultValue={a?.channel ?? "card"}>
              <option value="card">{tc("card")}</option><option value="wallet" disabled={!connected.wallet}>{tc("wallet")}</option><option value="email" disabled={!connected.email}>{tc("email")}</option>
            </select></Field>
            <Field label={t("coupon")} htmlFor={`${kind}-cp`}><select id={`${kind}-cp`} name="coupon_id" className={sel} defaultValue={a?.coupon_id ?? ""}><option value="">{t("noCoupon")}</option>{coupons.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2 text-xs text-fg-muted">
              <Badge tone={a?.enabled ? "success" : "neutral"} dot>{a?.enabled ? t("enabled") : t("disabled")}</Badge>
              {!!a?.total_sent && <span>{t("sent", { count: a.total_sent })}</span>}
              {a?.last_run_at && <span>· {t("lastRun", { date: format.relativeTime(new Date(a.last_run_at)) })}</span>}
            </div>
            <SubmitButton>{t("save")}</SubmitButton>
          </div>
        </div>
      </ActionForm>
    </Card>
  );
}

export function Automations({ automations, coupons, connected }: { automations: NonNullable<Automation>[]; coupons: { id: string; name: string }[]; connected: { email: boolean; wallet: boolean } }) {
  const t = useTranslations("auto");
  return (
    <section className="space-y-4">
      <div><h2 className="text-lg font-semibold tracking-[-0.02em]">{t("title")}</h2><p className="text-sm text-fg-muted">{t("subtitle")} {t("schedule")}</p></div>
      <div className="grid gap-4 lg:grid-cols-2">
        {(["winback", "birthday"] as const).map((k) => <AutomationCard key={k} kind={k} a={automations.find((x) => x.kind === k)} coupons={coupons} connected={connected} />)}
      </div>
    </section>
  );
}
