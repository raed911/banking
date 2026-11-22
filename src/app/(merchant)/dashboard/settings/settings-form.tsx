"use client";
import { useActionState, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { saveSettings } from "@/features/settings/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormAlert } from "@/components/forms/form-alert";
import { createClient } from "@/lib/supabase/client";
import { BRAND_BUCKET, publicAssetUrl } from "@/lib/storage";

type M = { name: string; legal_name: string | null; tax_id: string | null; email: string | null; phone: string | null; website: string | null; address: string | null; city: string | null; locale: string; brand_color: string; logo_path: string | null };

export function SettingsForm({ merchantId, m }: { merchantId: string; m: M }) {
  const t = useTranslations("settings");
  const [state, action] = useActionState(saveSettings, null);
  const [logo, setLogo] = useState(m.logo_path);
  const [color, setColor] = useState(m.brand_color);
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  async function upload(file?: File) {
    if (!file || file.size > 2 * 1024 * 1024 || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) return toast.error(t("logoHint"));
    setUploading(true);
    const path = `${merchantId}/logo-${crypto.randomUUID()}.${file.type.split("/")[1]}`;
    const { error } = await createClient().storage.from(BRAND_BUCKET).upload(path, file, { contentType: file.type, cacheControl: "31536000" });
    setUploading(false);
    if (error) return toast.error(t("error"));
    setLogo(path);
  }
  const f = (name: keyof M, label: string, type = "text", extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <Field label={label} htmlFor={name}><Input id={name} name={name} type={type} defaultValue={(m[name] as string) ?? ""} {...extra} /></Field>
  );
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="logo_path" value={logo ?? ""} />
      <input type="hidden" name="brand_color" value={color} />
      <FormAlert>{state?.error ? t(state.error as "error") : null}</FormAlert>
      <FormAlert tone="success">{state?.ok ? t("saved") : null}</FormAlert>
      <Card>
        <CardHeader><CardTitle>{t("branding")}</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-center gap-6">
          <button type="button" onClick={() => ref.current?.click()} className="grid size-20 place-items-center overflow-hidden rounded-2xl border border-dashed border-border-strong bg-surface-muted transition hover:border-ink-400" aria-label={t("logo")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logo ? <img src={publicAssetUrl(logo)!} alt="" className="size-full object-cover" /> : <ImagePlus className="size-6 text-fg-subtle" />}
          </button>
          <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
          <div className="min-w-0 flex-1"><div className="text-sm font-medium">{t("logo")}</div><div className="text-xs text-fg-muted">{uploading ? "…" : t("logoHint")}</div></div>
          <label className="flex items-center gap-3 rounded-xl border border-border-strong p-2.5">
            <span className="relative size-8 overflow-hidden rounded-lg ring-1 ring-black/10" style={{ background: color }}><input type="color" value={color} onChange={(e) => setColor(e.target.value.toUpperCase())} className="absolute inset-0 cursor-pointer opacity-0" aria-label={t("brandColor")} /></span>
            <span><span className="block text-xs text-fg-muted">{t("brandColor")}</span><span className="font-mono text-xs">{color}</span></span>
          </label>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t("business")}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {f("name", t("name"), "text", { required: true, minLength: 2, maxLength: 80 })}
          {f("phone", t("phone"), "tel", { dir: "ltr" })}
          {f("email", t("email"), "email", { dir: "ltr" })}
          {f("website", t("website"), "url", { dir: "ltr", placeholder: "https://" })}
          {f("address", t("address"))}
          {f("city", t("city"))}
          <Field label={t("locale")} htmlFor="locale">
            <select id="locale" name="locale" defaultValue={m.locale} className="h-10 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm"><option value="fr">Français</option><option value="ar">العربية</option><option value="en">English</option></select>
          </Field>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t("legal")}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">{f("legal_name", t("legalName"))}{f("tax_id", t("taxId"))}</CardContent>
      </Card>
      <div className="flex justify-end"><SubmitButton size="lg">{t("save")}</SubmitButton></div>
    </form>
  );
}
