"use client";
import { ActionForm } from "@/components/forms/action-form";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { updatePassword } from "@/features/auth/actions";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/forms/password-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormAlert } from "@/components/forms/form-alert";

export default function ResetPasswordPage() {
  const t = useTranslations("auth");
  const [state, action] = useActionState(updatePassword, null);
  return (
    <div className="animate-fade-up">
      <h1 className="text-3xl font-semibold tracking-[-0.03em]">{t("resetTitle")}</h1>
      <p className="mt-2 text-fg-muted">{t("resetSubtitle")}</p>
      <ActionForm action={action} className="mt-8 space-y-4">
        <FormAlert>{state?.error ? t(`errors.${state.error}` as "errors.generic") : null}</FormAlert>
        <Field label={t("newPassword")} htmlFor="password" hint={t("passwordHint")}>
          <PasswordInput id="password" name="password" autoComplete="new-password" required minLength={8} />
        </Field>
        <SubmitButton size="lg" className="w-full">{t("updatePassword")}</SubmitButton>
      </ActionForm>
    </div>
  );
}
