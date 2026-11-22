"use client";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { updatePrices } from "@/features/admin/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormAlert } from "@/components/forms/form-alert";

type Plan = { id: string; name: string; description: string | null; trial_days: number; prices: { id: string; period: string; amount_millimes: number; badge: string | null }[] };

export function PricesForm({ plan }: { plan: Plan }) {
  const t = useTranslations("admin");
  const [state, action] = useActionState(updatePrices, null);
  return (
    <Card>
      <CardHeader><div><CardTitle>{plan.name}</CardTitle><CardDescription>{plan.description}</CardDescription></div></CardHeader>
      <CardContent>
        <form action={action} className="space-y-5">
          <input type="hidden" name="plan_id" value={plan.id} />
          <FormAlert>{state?.error ? t(`errors.${state.error}` as "errors.generic") : null}</FormAlert>
          <FormAlert tone="success">{state?.ok ? t("plans.saved") : null}</FormAlert>
          <div className="grid gap-4 md:grid-cols-3">
            {plan.prices.map((p) => (
              <div key={p.id} className="space-y-3 rounded-2xl border border-border p-4">
                <div className="text-sm font-semibold">{t(`period.${p.period}` as "period.monthly")}</div>
                <Field label={t("plans.price")} htmlFor={`price-${p.id}`}><Input id={`price-${p.id}`} name={`price:${p.id}`} type="number" step="0.001" min="0" defaultValue={p.amount_millimes / 1000} /></Field>
                <Field label={t("plans.badge")} htmlFor={`badge-${p.id}`}><Input id={`badge-${p.id}`} name={`badge:${p.id}`} maxLength={40} defaultValue={p.badge ?? ""} /></Field>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <Field label={t("plans.trialDays")} htmlFor="trial_days" className="w-40"><Input id="trial_days" name="trial_days" type="number" min={0} max={90} defaultValue={plan.trial_days} /></Field>
            <SubmitButton>{t("plans.save")}</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
