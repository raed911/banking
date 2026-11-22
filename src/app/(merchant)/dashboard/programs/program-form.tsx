"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, CalendarCheck, Coins, Stamp } from "lucide-react";
import { createProgram, updateProgram } from "@/features/programs/actions";
import { WalletCard } from "@/components/loyalty/wallet-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormAlert } from "@/components/forms/form-alert";
import { cn } from "@/lib/utils";

type ProgramType = "stamps" | "points" | "visits";
export type ProgramValues = {
  id: string; name: string; description: string | null; type: ProgramType; stamps_required: number | null; points_per_unit: number | null;
  reward_title: string | null; welcome_bonus: number; cooldown_minutes: number; max_earn_per_day: number; max_earn_per_transaction: number; terms: string | null;
};

const TYPES: { key: ProgramType; icon: typeof Stamp }[] = [{ key: "stamps", icon: Stamp }, { key: "points", icon: Coins }, { key: "visits", icon: CalendarCheck }];

export function ProgramForm({ merchantName, program }: { merchantName: string; program?: ProgramValues }) {
  const t = useTranslations("programs");
  const action = program ? updateProgram.bind(null, program.id) : createProgram;
  const [state, formAction] = useActionState(action, null);
  const [type, setType] = useState<ProgramType>(program?.type ?? "stamps");
  const [name, setName] = useState(program?.name ?? "");
  const [stamps, setStamps] = useState(program?.stamps_required ?? 10);
  const [reward, setReward] = useState(program?.reward_title ?? "");
  const fe = state?.fieldErrors ?? {};

  return (
    <div className={cn(!program && "space-y-8")}>
      {!program && (
        <div>
          <Link href="/dashboard/programs" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg"><ArrowLeft className="size-4 rtl:rotate-180" />{t("title")}</Link>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] sm:text-[28px]">{t("new")}</h1>
        </div>
      )}
      <form action={formAction} className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <input type="hidden" name="type" value={type} />
        <div className="space-y-6">
          <FormAlert>{state?.error ? t(`errors.${state.error}` as "errors.generic") : null}</FormAlert>
          <FormAlert tone="success">{state?.ok ? t("form.saved") : null}</FormAlert>
          {!program && (
            <Card>
              <CardHeader><CardTitle>{t("form.chooseType")}</CardTitle></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                {TYPES.map(({ key, icon: Icon }) => (
                  <button type="button" key={key} onClick={() => setType(key)} aria-pressed={type === key}
                    className={cn("flex flex-col items-start gap-3 rounded-2xl border p-4 text-start transition-all", type === key ? "border-ink-900 bg-ink-900 text-white shadow-lg" : "border-border-strong hover:border-ink-300")}>
                    <span className={cn("grid size-10 place-items-center rounded-xl", type === key ? "bg-lime-300 text-ink-900" : "bg-surface-sunken")}><Icon className="size-5" /></span>
                    <span className="font-semibold">{t(`types.${key}`)}</span>
                    <span className={cn("text-xs leading-relaxed", type === key ? "text-ink-300" : "text-fg-muted")}>{t(`types.${key}Desc`)}</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader><CardTitle>{t("form.details")}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label={t("form.name")} htmlFor="name" error={fe.name && t("errors.validation")}>
                <Input id="name" name="name" required maxLength={80} defaultValue={program?.name} placeholder={t("form.namePlaceholder")} onChange={(e) => setName(e.target.value)} aria-invalid={!!fe.name} />
              </Field>
              <Field label={t("form.description")} htmlFor="description">
                <Input id="description" name="description" maxLength={240} defaultValue={program?.description ?? ""} placeholder={t("form.descriptionPlaceholder")} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                {type === "points" ? (
                  <Field label={t("form.pointsPerUnit")} htmlFor="points_per_unit" hint={t("form.pointsHint")} error={fe.points_per_unit && t("errors.validation")}>
                    <Input id="points_per_unit" name="points_per_unit" type="number" step="0.1" min="0.1" max="1000" defaultValue={program?.points_per_unit ?? 1} required />
                  </Field>
                ) : (
                  <Field label={t(type === "visits" ? "form.visitsRequired" : "form.stampsRequired")} htmlFor="stamps_required" error={fe.stamps_required && t("errors.validation")}>
                    <Input id="stamps_required" name="stamps_required" type="number" min={1} max={20} defaultValue={program?.stamps_required ?? 10} required onChange={(e) => setStamps(Number(e.target.value) || 1)} />
                  </Field>
                )}
                <Field label={t("form.rewardTitle")} htmlFor="reward_title">
                  <Input id="reward_title" name="reward_title" maxLength={80} defaultValue={program?.reward_title ?? ""} placeholder={t("form.rewardPlaceholder")} onChange={(e) => setReward(e.target.value)} />
                </Field>
                <Field label={t("form.welcomeBonus")} htmlFor="welcome_bonus" hint={t("form.welcomeHint")}>
                  <Input id="welcome_bonus" name="welcome_bonus" type="number" min={0} max={10000} defaultValue={program?.welcome_bonus ?? 0} />
                </Field>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><div><CardTitle>{t("form.rules")}</CardTitle><CardDescription>{t("form.rulesDesc")}</CardDescription></div></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <Field label={t("form.cooldown")} htmlFor="cooldown_minutes"><Input id="cooldown_minutes" name="cooldown_minutes" type="number" min={0} max={1440} defaultValue={program?.cooldown_minutes ?? 5} /></Field>
              <Field label={t("form.maxPerDay")} htmlFor="max_earn_per_day"><Input id="max_earn_per_day" name="max_earn_per_day" type="number" min={1} defaultValue={program?.max_earn_per_day ?? (type === "points" ? 100000 : 3)} key={`d-${type}`} /></Field>
              <Field label={t("form.maxPerTx")} htmlFor="max_earn_per_transaction"><Input id="max_earn_per_transaction" name="max_earn_per_transaction" type="number" min={1} defaultValue={program?.max_earn_per_transaction ?? (type === "points" ? 100000 : 1)} key={`t-${type}`} /></Field>
              <Field label={t("form.terms")} htmlFor="terms" className="sm:col-span-3"><Textarea id="terms" name="terms" maxLength={1000} defaultValue={program?.terms ?? ""} placeholder={t("form.termsPlaceholder")} /></Field>
            </CardContent>
          </Card>
          <div className="flex justify-end"><SubmitButton size="lg" variant={program ? "primary" : "accent"}>{program ? t("form.save") : t("form.create")}</SubmitButton></div>
        </div>
        <div className="sticky top-8 hidden xl:block">
          <div className="bg-grid-ink flex justify-center rounded-3xl border border-border bg-surface-muted p-8">
            <WalletCard merchantName={merchantName} programName={name || t("form.namePlaceholder")} type={type} stampsRequired={Math.min(stamps, 20)} balance={type === "points" ? 250 : Math.ceil(stamps / 2)} rewardTitle={reward || null} customerName="Leila B." />
          </div>
        </div>
      </form>
    </div>
  );
}
