"use client";
import { ActionForm } from "@/components/forms/action-form";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { enroll } from "@/features/enrollment/actions";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormAlert } from "@/components/forms/form-alert";
import { BirthdayInput } from "@/components/forms/birthday-input";

export function JoinForm({ code, merchant, requirePhone, requireEmail, collectBirthday }: { code: string; merchant: string; requirePhone: boolean; requireEmail: boolean; collectBirthday: boolean }) {
  const t = useTranslations("public.join");
  const [state, action] = useActionState(enroll.bind(null, code), null);
  return (
    <ActionForm action={action} className="mt-5 space-y-4">
      <FormAlert>{state?.error ? t(`errors.${state.error}` as "errors.generic") : null}</FormAlert>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("firstName")} htmlFor="first_name"><Input id="first_name" name="first_name" autoComplete="given-name" required maxLength={60} className="h-12 text-base" /></Field>
        <Field label={t("lastName")} htmlFor="last_name" optional={t("optional")}><Input id="last_name" name="last_name" autoComplete="family-name" maxLength={60} className="h-12 text-base" /></Field>
      </div>
      <Field label={t("phone")} htmlFor="phone" optional={requirePhone ? undefined : t("optional")} error={state?.fieldErrors?.phone ? t("errors.invalid_phone") : undefined}>
        <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required={requirePhone} placeholder="20 123 456" className="h-12 text-base" dir="ltr" />
      </Field>
      <Field label={t("email")} htmlFor="email" optional={requireEmail ? undefined : t("optional")} error={state?.fieldErrors?.email ? t("errors.invalid_email") : undefined}>
        <Input id="email" name="email" type="email" autoComplete="email" required={requireEmail} className="h-12 text-base" dir="ltr" />
      </Field>
      <Field label={t("birthday")} htmlFor="birthday" optional={collectBirthday ? undefined : t("optional")}><BirthdayInput id="birthday" size="lg" /></Field>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <label className="flex items-start gap-3 text-sm text-fg-muted"><input type="checkbox" name="consent" className="mt-0.5 size-4 accent-ink-900" />{t("consent", { merchant })}</label>
      <SubmitButton size="xl" variant="accent" className="w-full">{t("submit")}</SubmitButton>
      <p className="text-center text-xs text-fg-subtle">{t("privacy", { merchant })}</p>
    </ActionForm>
  );
}
