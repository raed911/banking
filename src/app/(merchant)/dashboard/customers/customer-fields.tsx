"use client";
import { useTranslations } from "next-intl";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { BirthdayInput } from "@/components/forms/birthday-input";

export type CustomerValues = { first_name: string; last_name: string | null; phone: string | null; email: string | null; birthday: string | null; notes: string | null; tags: string[]; marketing_consent: boolean };

export function CustomerFields({ c, programs }: { c?: CustomerValues; programs?: { id: string; name: string }[] }) {
  const t = useTranslations("customers.form");
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("firstName")} htmlFor="first_name"><Input id="first_name" name="first_name" required maxLength={60} defaultValue={c?.first_name} /></Field>
        <Field label={t("lastName")} htmlFor="last_name"><Input id="last_name" name="last_name" maxLength={60} defaultValue={c?.last_name ?? ""} /></Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("phone")} htmlFor="phone"><Input id="phone" name="phone" type="tel" dir="ltr" defaultValue={c?.phone ?? ""} placeholder="20 123 456" /></Field>
        <Field label={t("email")} htmlFor="c-email"><Input id="c-email" name="email" type="email" dir="ltr" defaultValue={c?.email ?? ""} /></Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("birthday")} htmlFor="birthday"><BirthdayInput id="birthday" defaultValue={c?.birthday} /></Field>
        {programs ? (
          <Field label={t("program")} htmlFor="program_id">
            <select id="program_id" name="program_id" defaultValue={programs[0]?.id ?? ""} className="h-10 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm">
              <option value="">{t("noProgram")}</option>
              {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
        ) : (
          <Field label={t("tags")} htmlFor="tags" hint={t("tagsHint")}><Input id="tags" name="tags" defaultValue={c?.tags.join(", ")} /></Field>
        )}
      </div>
      {!programs && <Field label={t("notes")} htmlFor="notes"><Textarea id="notes" name="notes" maxLength={2000} defaultValue={c?.notes ?? ""} /></Field>}
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="marketing_consent" defaultChecked={c?.marketing_consent} className="size-4 accent-ink-900" />{t("consent")}</label>
    </div>
  );
}
