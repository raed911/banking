"use client";
import { ActionForm } from "@/components/forms/action-form";
import Link from "next/link";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { MailCheck } from "lucide-react";
import { signUp } from "@/features/auth/actions";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/forms/password-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormAlert } from "@/components/forms/form-alert";

export function RegisterForm({ next }: { next?: string }) {
  const t = useTranslations("auth");
  const [state, action] = useActionState(signUp, null);

  if (state?.ok) {
    return (
      <div className="animate-fade-up text-center">
        <div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl bg-ink-900 text-lime-300 shadow-lg"><MailCheck className="size-7" /></div>
        <h1 className="text-2xl font-semibold tracking-[-0.03em]">{t("checkEmailTitle")}</h1>
        <p className="mt-3 text-fg-muted">{t("checkEmailBody", { email: String(state.data?.email ?? "") })}</p>
        <Link href="/login" className="mt-8 inline-block text-sm font-semibold underline-offset-4 hover:underline">{t("backToLogin")}</Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <h1 className="text-3xl font-semibold tracking-[-0.03em]">{t("registerTitle")}</h1>
      <p className="mt-2 text-fg-muted">{t("registerSubtitle")}</p>
      <ActionForm action={action} className="mt-8 space-y-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <FormAlert>{state?.error ? t(`errors.${state.error}` as "errors.generic") : null}</FormAlert>
        <Field label={t("fullName")} htmlFor="fullName">
          <Input id="fullName" name="fullName" autoComplete="name" required minLength={2} maxLength={80} aria-invalid={!!state?.fieldErrors?.fullName} />
        </Field>
        <Field label={t("email")} htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!state?.fieldErrors?.email} placeholder="vous@commerce.tn" />
        </Field>
        <Field label={t("password")} htmlFor="password" hint={t("passwordHint")}>
          <PasswordInput id="password" name="password" autoComplete="new-password" required minLength={8} aria-invalid={!!state?.fieldErrors?.password} />
        </Field>
        <SubmitButton size="lg" variant="accent" className="w-full">{t("signUp")}</SubmitButton>
        <p className="text-center text-xs text-fg-subtle">{t("terms")}</p>
      </ActionForm>
      <p className="mt-8 text-center text-sm text-fg-muted">
        {t("hasAccount")} <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-semibold text-fg underline-offset-4 hover:underline">{t("signInLink")}</Link>
      </p>
    </div>
  );
}
