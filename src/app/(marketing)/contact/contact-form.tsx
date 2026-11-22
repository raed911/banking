"use client";
import { ActionForm } from "@/components/forms/action-form";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { sendContact } from "@/features/contact/actions";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormAlert } from "@/components/forms/form-alert";

export function ContactForm() {
  const t = useTranslations("site.contact");
  const [state, action] = useActionState(sendContact, null);
  if (state?.ok) return <FormAlert tone="success" className="text-base">{t("sent")}</FormAlert>;
  return (
    <ActionForm action={action} className="space-y-4 rounded-3xl border border-ink-150 bg-ink-50 p-6 sm:p-8">
      <FormAlert>{state?.error ? t(state.error as "error") : null}</FormAlert>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("name")} htmlFor="name"><Input id="name" name="name" required minLength={2} maxLength={80} className="h-11" /></Field>
        <Field label={t("email")} htmlFor="email"><Input id="email" name="email" type="email" required className="h-11" dir="ltr" /></Field>
        <Field label={t("phone")} htmlFor="phone"><Input id="phone" name="phone" type="tel" className="h-11" dir="ltr" /></Field>
        <Field label={t("business")} htmlFor="business"><Input id="business" name="business" maxLength={120} className="h-11" /></Field>
      </div>
      <Field label={t("message")} htmlFor="message"><Textarea id="message" name="message" required minLength={5} maxLength={3000} className="min-h-36" /></Field>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <SubmitButton size="lg" className="w-full"><Send />{t("send")}</SubmitButton>
    </ActionForm>
  );
}
