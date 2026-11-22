"use client";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Coffee, Croissant, Dumbbell, MoreHorizontal, Scissors, ShoppingBag, ShoppingBasket, UtensilsCrossed } from "lucide-react";
import { createMerchant } from "@/features/onboarding/actions";
import { INDUSTRIES } from "@/features/onboarding/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormAlert } from "@/components/forms/form-alert";
import { WalletCard } from "@/components/loyalty/wallet-card";
import { cn } from "@/lib/utils";

const ICONS = { cafe: Coffee, restaurant: UtensilsCrossed, bakery: Croissant, beauty: Scissors, retail: ShoppingBag, fitness: Dumbbell, grocery: ShoppingBasket, other: MoreHorizontal } as const;
const STAMP_FOR = { cafe: "coffee", restaurant: "pizza", bakery: "croissant", beauty: "scissors", retail: "bag", fitness: "dumbbell", grocery: "bag", other: "star" } as const;

export function OnboardingForm() {
  const t = useTranslations("onboarding");
  const [state, action] = useActionState(createMerchant, null);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState<(typeof INDUSTRIES)[number]>("cafe");

  return (
    <div className="grid w-full max-w-5xl items-start gap-10 lg:grid-cols-[1fr_360px]">
      <div className="animate-fade-up">
        <span className="inline-flex items-center gap-2 rounded-full bg-lime-100 px-3 py-1 text-xs font-semibold text-lime-800">{t("step", { current: 1, total: 1 })}</span>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">{t("title")}</h1>
        <p className="mt-2 max-w-lg text-fg-muted">{t("subtitle")}</p>
        <Card className="mt-8">
          <CardContent>
            <form action={action} className="space-y-6">
              <FormAlert>{state?.error && state.error !== "generic" ? t(`errors.${state.error}` as "errors.generic") : state?.error ? t("errors.generic") : null}</FormAlert>
              <Field label={t("businessName")} htmlFor="name">
                <Input id="name" name="name" required minLength={2} maxLength={80} placeholder={t("businessNamePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} className="h-12 text-base" />
              </Field>
              <fieldset>
                <legend className="mb-2 text-[13px] font-medium">{t("industry")}</legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {INDUSTRIES.map((key) => {
                    const Icon = ICONS[key];
                    const active = industry === key;
                    return (
                      <label key={key} className={cn("group flex cursor-pointer flex-col items-start gap-3 rounded-xl border p-3 transition-all", active ? "border-ink-900 bg-ink-900 text-white shadow-md" : "border-border-strong bg-surface hover:border-ink-300")}>
                        <input type="radio" name="industry" value={key} checked={active} onChange={() => setIndustry(key)} className="sr-only" />
                        <span className={cn("grid size-8 place-items-center rounded-lg", active ? "bg-lime-300 text-ink-900" : "bg-surface-sunken text-fg-muted")}><Icon className="size-4" /></span>
                        <span className="text-sm font-medium">{t(`industries.${key}`)}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("city")} htmlFor="city"><Input id="city" name="city" maxLength={60} placeholder="Tunis" /></Field>
                <Field label={t("phone")} htmlFor="phone" hint={t("phoneHint")} error={state?.fieldErrors?.phone ? t("errors.invalid_phone") : undefined}>
                  <Input id="phone" name="phone" type="tel" inputMode="tel" maxLength={30} placeholder="+216 20 123 456" aria-invalid={!!state?.fieldErrors?.phone} />
                </Field>
              </div>
              <div className="flex flex-col-reverse items-start justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
                <p className="text-sm text-fg-muted">{t("trialNote")}</p>
                <SubmitButton size="lg" variant="accent">{t("submit")}</SubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      <div className="sticky top-8 hidden justify-center lg:flex">
        <WalletCard merchantName={name || t("businessNamePlaceholder")} programName="Carte fidélité" type="stamps" stampsRequired={8} balance={3} stampIcon={STAMP_FOR[industry]} className="animate-float" />
      </div>
    </div>
  );
}
