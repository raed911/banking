"use client";
import Link from "next/link";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Mail } from "lucide-react";
import { signIn } from "@/features/auth/actions";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/forms/password-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormAlert } from "@/components/forms/form-alert";

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const t = useTranslations("auth");
  const [state, action] = useActionState(signIn, null);
  const error = state?.error ?? initialError;
  return (
    <div className="animate-fade-up">
      <h1 className="text-3xl font-semibold tracking-[-0.03em]">{t("loginTitle")}</h1>
      <p className="mt-2 text-fg-muted">{t("loginSubtitle")}</p>
      <form action={action} className="mt-8 space-y-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <FormAlert>{error ? t(`errors.${error}` as "errors.generic") : null}</FormAlert>
        <Field label={t("email")} htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required leading={<Mail />} placeholder="vous@commerce.tn" />
        </Field>
        <Field label={t("password")} htmlFor="password">
          <PasswordInput id="password" name="password" autoComplete="current-password" required />
        </Field>
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm font-medium text-fg-muted transition hover:text-fg">{t("forgot")}</Link>
        </div>
        <SubmitButton size="lg" className="w-full">{t("signIn")}</SubmitButton>
      </form>
      <p className="mt-8 text-center text-sm text-fg-muted">
        {t("noAccount")} <Link href="/register" className="font-semibold text-fg underline-offset-4 hover:underline">{t("createOne")}</Link>
      </p>
    </div>
  );
}
