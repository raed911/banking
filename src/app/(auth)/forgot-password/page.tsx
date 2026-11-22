"use client";
import Link from "next/link";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Mail } from "lucide-react";
import { requestPasswordReset } from "@/features/auth/actions";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormAlert } from "@/components/forms/form-alert";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const [state, action] = useActionState(requestPasswordReset, null);
  return (
    <div className="animate-fade-up">
      <Link href="/login" className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg"><ArrowLeft className="size-4 rtl:rotate-180" />{t("backToLogin")}</Link>
      <h1 className="text-3xl font-semibold tracking-[-0.03em]">{t("forgotTitle")}</h1>
      <p className="mt-2 text-fg-muted">{t("forgotSubtitle")}</p>
      <form action={action} className="mt-8 space-y-4">
        <FormAlert>{state?.error ? t(`errors.${state.error}` as "errors.generic") : null}</FormAlert>
        <FormAlert tone="success">{state?.ok ? t("resetSent") : null}</FormAlert>
        <Field label={t("email")} htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required leading={<Mail />} />
        </Field>
        <SubmitButton size="lg" className="w-full">{t("sendLink")}</SubmitButton>
      </form>
    </div>
  );
}
