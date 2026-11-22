"use client";
import { ActionForm } from "@/components/forms/action-form";
import { useActionState, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ShieldCheck, Trash2 } from "lucide-react";
import { changePassword, saveProfile } from "@/features/account/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/forms/password-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormAlert } from "@/components/forms/form-alert";
import { createClient } from "@/lib/supabase/client";

export function ProfileForm({ profile }: { profile: { full_name: string; phone: string; locale: string } }) {
  const t = useTranslations("account");
  const [state, action] = useActionState(saveProfile, null);
  return (
    <ActionForm action={action} className="space-y-4">
      <FormAlert>{state?.error ? t("errors.generic") : null}</FormAlert>
      <FormAlert tone="success">{state?.ok ? t("saved") : null}</FormAlert>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("fullName")} htmlFor="full_name"><Input id="full_name" name="full_name" required minLength={2} maxLength={80} defaultValue={profile.full_name} /></Field>
        <Field label={t("phone")} htmlFor="acc-phone"><Input id="acc-phone" name="phone" type="tel" dir="ltr" defaultValue={profile.phone} /></Field>
        <Field label={t("language")} htmlFor="acc-locale"><select id="acc-locale" name="locale" defaultValue={profile.locale} className="h-10 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm"><option value="fr">Français</option><option value="ar">العربية</option><option value="en">English</option></select></Field>
      </div>
      <div className="flex justify-end"><SubmitButton>{t("save")}</SubmitButton></div>
    </ActionForm>
  );
}

export function PasswordForm() {
  const t = useTranslations("account");
  const [state, action] = useActionState(changePassword, null);
  return (
    <ActionForm action={action} className="space-y-4">
      <FormAlert>{state?.error ? t(`errors.${state.error}` as "errors.generic") : null}</FormAlert>
      <FormAlert tone="success">{state?.ok ? t("passwordChanged") : null}</FormAlert>
      <Field label={t("newPassword")} htmlFor="new-password" hint={t("passwordHint")}><PasswordInput id="new-password" name="password" autoComplete="new-password" required minLength={8} /></Field>
      <div className="flex justify-end"><SubmitButton variant="secondary">{t("changePassword")}</SubmitButton></div>
    </ActionForm>
  );
}

type Factor = { id: string; friendly_name?: string; status: string; created_at: string };

export function MfaManager({ redirectTo }: { redirectTo: string | null }) {
  const t = useTranslations("account");
  const router = useRouter();
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    const { data } = await createClient().auth.mfa.listFactors();
    setFactors((data?.totp ?? []).filter((f) => f.status === "verified") as Factor[]);
  }, []);
  useEffect(() => {
    let alive = true;
    createClient().auth.mfa.listFactors().then(({ data }) => { if (alive) setFactors((data?.totp ?? []).filter((f) => f.status === "verified") as Factor[]); });
    return () => { alive = false; };
  }, []);

  async function start() {
    setBusy(true); setError(null);
    const supabase = createClient();
    const { data: all } = await supabase.auth.mfa.listFactors();
    for (const f of all?.all ?? []) if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error: e } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `VAYRO ${new Date().toISOString().slice(0, 10)}`, issuer: "VAYRO" });
    setBusy(false);
    if (e || !data) return setError("generic");
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }
  async function verify() {
    if (!enroll) return;
    setBusy(true); setError(null);
    const { error: e } = await createClient().auth.mfa.challengeAndVerify({ factorId: enroll.id, code: code.trim() });
    setBusy(false);
    if (e) return setError("invalid_code");
    setEnroll(null); setCode(""); setDone(true);
    await load();
    if (redirectTo) router.push(redirectTo); else router.refresh();
  }
  async function remove(id: string) {
    if (!confirm(t("removeConfirm"))) return;
    const { error: e } = await createClient().auth.mfa.unenroll({ factorId: id });
    if (e) setError(e.code === "insufficient_aal" ? "reauth" : "generic");
    await load();
  }

  if (factors === null) return <div className="skeleton h-12 rounded-xl" />;
  return (
    <div className="space-y-4">
      <FormAlert>{error ? t(`errors.${error}` as "errors.generic") : null}</FormAlert>
      <FormAlert tone="success">{done ? t("activated") : null}</FormAlert>
      {factors.map((f) => (
        <div key={f.id} className="flex items-center gap-3 rounded-2xl border border-border p-3">
          <span className="grid size-10 place-items-center rounded-xl bg-lime-100 text-lime-800"><ShieldCheck className="size-5" /></span>
          <span className="flex-1 text-sm font-medium">{f.friendly_name ?? "TOTP"}</span><Badge tone="success" dot>{t("enabled")}</Badge>
          <Button variant="ghost" size="icon" aria-label={t("remove")} onClick={() => remove(f.id)}><Trash2 /></Button>
        </div>
      ))}
      {!factors.length && !enroll && <div className="flex items-center justify-between rounded-2xl border border-dashed border-border-strong p-4"><Badge>{t("disabled")}</Badge><Button onClick={start} loading={busy}><ShieldCheck />{t("enable")}</Button></div>}
      {enroll && (
        <div className="grid gap-5 rounded-2xl border border-border p-5 sm:grid-cols-[200px_1fr]">
          <div className="rounded-xl bg-white p-2 ring-1 ring-border">
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL SVG generated by Supabase Auth */}
            <img src={enroll.qr} alt="QR" className="size-full" />
          </div>
          <div className="space-y-3 text-sm">
            <p>{t("step1")}</p>
            <p className="text-fg-muted">{t("manual")} <code className="break-all rounded bg-surface-sunken px-1.5 py-0.5 font-mono text-xs" dir="ltr">{enroll.secret}</code></p>
            <p>{t("step2")}</p>
            <div className="flex gap-2"><Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" className="h-11 w-36 text-center font-mono text-lg tracking-[0.3em]" aria-label={t("code")} dir="ltr" />
              <Button onClick={verify} loading={busy} disabled={code.length !== 6}>{t("verify")}</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}
