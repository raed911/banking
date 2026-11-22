"use client";
import { useActionState, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { saveDesign } from "@/features/programs/actions";
import { contrastRatio } from "@/features/programs/schemas";
import { STAMP_ICONS, WalletCard } from "@/components/loyalty/wallet-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormAlert } from "@/components/forms/form-alert";
import { createClient } from "@/lib/supabase/client";
import { BRAND_BUCKET, publicAssetUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

type Design = { background_color: string; foreground_color: string; label_color: string; accent_color: string; stamp_icon: string; logo_text: string | null; logo_path: string | null; strip_path: string | null };

const PRESETS: { name: string; c: [string, string, string, string] }[] = [
  { name: "VAYRO", c: ["#101828", "#FFFFFF", "#C6F36B", "#C6F36B"] },
  { name: "Lime", c: ["#C6F36B", "#101828", "#101828", "#101828"] },
  { name: "Espresso", c: ["#2B1D16", "#F6EDE3", "#E0B07A", "#E0B07A"] },
  { name: "Rose", c: ["#FCE7EC", "#4A1426", "#B4235A", "#B4235A"] },
  { name: "Ocean", c: ["#0B3B5C", "#FFFFFF", "#7FD1FF", "#7FD1FF"] },
  { name: "Ivory", c: ["#FAF7F0", "#1B1B1B", "#8A6D3B", "#1B1B1B"] },
];

const COLOR_FIELDS = [["background_color", "background"], ["foreground_color", "foreground"], ["label_color", "label"], ["accent_color", "accent"]] as const;

export function CardDesigner({ programId, merchantId, merchantName, program, design, canEdit }: {
  programId: string; merchantId: string; merchantName: string; canEdit: boolean;
  program: { name: string; type: "stamps" | "points" | "visits"; stamps_required: number | null; reward_title: string | null };
  design: Design | null;
}) {
  const t = useTranslations("programs.design");
  const tf = useTranslations("programs");
  const [state, action] = useActionState(saveDesign.bind(null, programId), null);
  const [d, setD] = useState<Design>(design ?? { background_color: "#101828", foreground_color: "#FFFFFF", label_color: "#C6F36B", accent_color: "#C6F36B", stamp_icon: "coffee", logo_text: merchantName, logo_path: null, strip_path: null });
  const [uploading, setUploading] = useState<"logo" | "strip" | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const stripRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Design>(k: K, v: Design[K]) => setD((p) => ({ ...p, [k]: v }));
  const lowContrast = contrastRatio(d.background_color, d.foreground_color) < 4.5;

  async function upload(kind: "logo" | "strip", file: File | undefined) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024 || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) return toast.error(t("uploadError"));
    setUploading(kind);
    const ext = file.type.split("/")[1];
    const path = `${merchantId}/${programId}/${kind}-${crypto.randomUUID()}.${ext}`;
    const { error } = await createClient().storage.from(BRAND_BUCKET).upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
    setUploading(null);
    if (error) return toast.error(t("uploadError"));
    set(kind === "logo" ? "logo_path" : "strip_path", path);
  }

  return (
    <form action={action} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      {Object.entries(d).map(([k, v]) => <input key={k} type="hidden" name={k} value={v ?? ""} />)}
      <div className="space-y-6">
        <FormAlert>{state?.error ? tf(`errors.${state.error}` as "errors.generic") : null}</FormAlert>
        <FormAlert tone="success">{state?.ok ? tf("form.saved") : null}</FormAlert>
        <Card>
          <CardHeader><div><CardTitle>{t("presets")}</CardTitle><CardDescription>{t("desc")}</CardDescription></div></CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button type="button" key={p.name} disabled={!canEdit} onClick={() => setD((s) => ({ ...s, background_color: p.c[0], foreground_color: p.c[1], label_color: p.c[2], accent_color: p.c[3] }))}
                  className="group flex items-center gap-2 rounded-full border border-border-strong py-1 pe-3 ps-1 text-sm font-medium transition hover:border-ink-400">
                  <span className="relative size-6 overflow-hidden rounded-full ring-1 ring-black/10" style={{ background: p.c[0] }}><span className="absolute bottom-0 end-0 size-3 rounded-tl-full" style={{ background: p.c[3] }} /></span>
                  {p.name}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {COLOR_FIELDS.map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 rounded-xl border border-border-strong p-2.5 transition focus-within:ring-4 focus-within:ring-[var(--ring)]">
                  <span className="relative size-8 shrink-0 overflow-hidden rounded-lg ring-1 ring-black/10" style={{ background: d[key] }}>
                    <input type="color" disabled={!canEdit} value={d[key]} onChange={(e) => set(key, e.target.value.toUpperCase())} className="absolute inset-0 size-full cursor-pointer opacity-0" aria-label={t(label)} />
                  </span>
                  <span className="min-w-0"><span className="block text-xs text-fg-muted">{t(label)}</span><span className="font-mono text-xs uppercase">{d[key]}</span></span>
                </label>
              ))}
            </div>
            {lowContrast && <p className="flex items-center gap-2 text-sm text-warning-700"><AlertTriangle className="size-4" />{t("contrastWarn")}</p>}
          </CardContent>
        </Card>

        {program.type !== "points" && (
          <Card>
            <CardHeader><CardTitle>{t("icon")}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-5 gap-2 sm:grid-cols-10">
              {Object.entries(STAMP_ICONS).map(([key, Icon]) => (
                <button type="button" key={key} disabled={!canEdit} onClick={() => set("stamp_icon", key)} aria-pressed={d.stamp_icon === key} aria-label={key}
                  className={cn("grid aspect-square place-items-center rounded-xl border transition", d.stamp_icon === key ? "border-ink-900 bg-ink-900 text-lime-300" : "border-border-strong hover:border-ink-300")}>
                  <Icon className="size-5" />
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="space-y-6">
            <Field label={t("headerLabel")} htmlFor="logo_text_input">
              <Input id="logo_text_input" maxLength={40} disabled={!canEdit} value={d.logo_text ?? ""} onChange={(e) => set("logo_text", e.target.value)} />
            </Field>
            {([["logo", "logo_path", logoRef, "logoHint"], ["strip", "strip_path", stripRef, "stripHint"]] as const).map(([kind, key, ref, hint]) => (
              <div key={kind} className="flex flex-wrap items-center gap-4">
                <div className={cn("grid shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-border-strong bg-surface-muted", kind === "logo" ? "size-16" : "h-16 w-40")}>
                  {d[key] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={publicAssetUrl(d[key])!} alt="" className="size-full object-cover" />
                  ) : <ImagePlus className="size-5 text-fg-subtle" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{t(kind === "logo" ? "logo" : "strip")}</div>
                  <div className="text-xs text-fg-muted">{t(hint)}</div>
                </div>
                {canEdit && (
                  <div className="flex gap-2">
                    <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => upload(kind, e.target.files?.[0])} />
                    <button type="button" onClick={() => ref.current?.click()} disabled={!!uploading} className="h-9 rounded-lg border border-border-strong px-3 text-sm font-medium transition hover:bg-surface-muted disabled:opacity-50">
                      {uploading === kind ? t("uploading") : d[key] ? t("replace") : t("upload")}
                    </button>
                    {d[key] && <button type="button" onClick={() => set(key, null)} className="grid size-9 place-items-center rounded-lg text-fg-muted transition hover:bg-danger-50 hover:text-danger-500" aria-label={t("remove")}><Trash2 className="size-4" /></button>}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
        {canEdit && <div className="flex justify-end"><SubmitButton size="lg">{tf("form.save")}</SubmitButton></div>}
      </div>

      <div className="lg:sticky lg:top-8">
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-fg-subtle">{t("preview")}</div>
        <div className="bg-grid-ink mt-3 flex justify-center rounded-3xl border border-border bg-gradient-to-b from-surface-muted to-surface p-6 sm:p-10">
          <WalletCard merchantName={d.logo_text || merchantName} programName={program.name} type={program.type} stampsRequired={program.stamps_required}
            balance={program.type === "points" ? 340 : Math.ceil((program.stamps_required ?? 10) * 0.6)} customerName="Leila B." rewardTitle={program.reward_title}
            backgroundColor={d.background_color} foregroundColor={d.foreground_color} labelColor={d.label_color} accentColor={d.accent_color}
            stampIcon={d.stamp_icon} logoUrl={publicAssetUrl(d.logo_path)} stripUrl={publicAssetUrl(d.strip_path)} serial="VY7K-29QM" />
        </div>
      </div>
    </form>
  );
}
