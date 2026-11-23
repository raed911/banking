"use client";
import { ActionForm } from "@/components/forms/action-form";
import { useActionState, useRef, useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Apple, CheckCircle2, CircleAlert, CircleDashed, Download, ExternalLink, FileUp, PlugZap, Smartphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { generateAppleCsr, readAppleCertificate, removeIntegration, saveIntegration, testIntegration } from "@/features/integrations/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { PasswordInput } from "@/components/forms/password-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormAlert } from "@/components/forms/form-alert";

export type IntegrationState = { status: "not_configured" | "configured" | "verified" | "error"; config: Record<string, string>; hints: Record<string, string>; lastVerifiedAt: string | null; lastError: string | null } | null;
type Scope = { kind: "platform" } | { kind: "merchant" };
const TONE = { not_configured: "neutral", configured: "warning", verified: "success", error: "danger" } as const;
const ICON = { not_configured: CircleDashed, configured: CircleAlert, verified: CheckCircle2, error: CircleAlert };

function Shell({ icon, title, desc, state, scope, provider, children }: { icon: React.ReactNode; title: string; desc: string; state: IntegrationState; scope: Scope; provider: "google_wallet" | "apple_wallet"; children: React.ReactNode }) {
  const t = useTranslations("integ");
  const format = useFormatter();
  const [pending, start] = useTransition();
  const status = state?.status ?? "not_configured";
  const Icon = ICON[status];
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-4 border-b border-border p-5">
        <span className="grid size-12 place-items-center rounded-2xl bg-ink-900 text-white">{icon}</span>
        <div className="min-w-0 flex-1"><h2 className="font-semibold">{title}</h2><p className="text-sm text-fg-muted">{desc}</p></div>
        <Badge tone={TONE[status]}><Icon />{t(`status.${status}`)}</Badge>
      </div>
      <div className="p-5">{children}</div>
      {state && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border bg-surface-muted/60 px-5 py-3 text-xs text-fg-muted">
          {state.lastVerifiedAt && status === "verified" && <span>{t("verifiedAt", { date: format.relativeTime(new Date(state.lastVerifiedAt)) })}</span>}
          {state.config.certificateExpiresAt && <span>{t("expires", { date: format.dateTime(new Date(state.config.certificateExpiresAt), { dateStyle: "medium" }) })}</span>}
          {status === "error" && state.lastError && <span className="text-danger-700">{t.has(`errors.${state.lastError}`) ? t(`errors.${state.lastError}` as "errors.generic") : state.lastError}</span>}
          <span className="ms-auto flex gap-2">
            <Button size="sm" variant="secondary" loading={pending} onClick={() => start(async () => { const r = await testIntegration(scope, provider); if (r.ok) toast.success(`${t("status.verified")}${r.detail ? ` · ${r.detail}` : ""}`); else toast.error(t.has(`errors.${r.error}`) ? t(`errors.${r.error}` as "errors.generic") : r.error ?? t("errors.generic")); })}><PlugZap />{t("test")}</Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => confirm(t("removeConfirm")) && start(() => removeIntegration(scope, provider))}><Trash2 />{t("remove")}</Button>
          </span>
        </div>
      )}
    </Card>
  );
}

export function GoogleWalletForm({ state, scope }: { state: IntegrationState; scope: Scope }) {
  const t = useTranslations("integ");
  const [email, setEmail] = useState(state?.config.serviceAccountEmail ?? "");
  const [key, setKey] = useState("");
  // never keep a saved secret on screen: clear the field as soon as the server confirms it is stored
  const [res, action] = useActionState(async (p: Awaited<ReturnType<typeof saveIntegration>>, fd: FormData) => { const r = await saveIntegration(scope, "google_wallet", p, fd); if (r?.ok) setKey(""); return r; }, null);
  const fileRef = useRef<HTMLInputElement>(null);
  async function readJson(file?: File) {
    if (!file) return;
    try { const j = JSON.parse(await file.text()) as { client_email?: string; private_key?: string }; if (j.client_email) setEmail(j.client_email); if (j.private_key) setKey(j.private_key); } catch { toast.error(t("errors.validation")); }
    if (fileRef.current) fileRef.current.value = "";
  }
  return (
    <Shell icon={<Smartphone className="size-6" />} title={t("google.title")} desc={t("google.desc")} state={state} scope={scope} provider="google_wallet">
      <ActionForm action={action} className="space-y-4" autoComplete="off">
        <FormAlert>{res?.error ? t(`errors.${res.error}` as "errors.generic") : null}</FormAlert>
        <FormAlert tone="success">{res?.ok ? t("saved") : null}</FormAlert>
        <Field label={t("google.issuerId")} htmlFor="g-issuer" hint={t("google.issuerHint")}><Input id="g-issuer" name="issuerId" required inputMode="numeric" defaultValue={state?.config.issuerId} dir="ltr" className="font-mono" /></Field>
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-border-strong p-3">
          <FileUp className="size-5 text-fg-subtle" /><span className="flex-1 text-xs text-fg-muted">{t("google.jsonHint")}</span>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => readJson(e.target.files?.[0])} />
          <Button type="button" size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>{t("google.json")}</Button>
        </div>
        <Field label={t("google.email")} htmlFor="g-email" hint={t("google.emailHint")}><Input id="g-email" name="serviceAccountEmail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" /></Field>
        <Field label={t("google.key")} htmlFor="g-key" hint={state?.hints.privateKey ? `${t("secretSaved", { hint: state.hints.privateKey })} · ${t("keepSecret")}` : t("google.keyHint")}>
          <Textarea id="g-key" name="privateKey" value={key} onChange={(e) => setKey(e.target.value)} required={!state?.hints.privateKey} placeholder="-----BEGIN PRIVATE KEY-----" className="min-h-28 font-mono text-xs [-webkit-text-security:disc]" dir="ltr" spellCheck={false} autoComplete="off" />
        </Field>
        <div className="flex justify-end"><SubmitButton>{t("save")}</SubmitButton></div>
      </ActionForm>
    </Shell>
  );
}

export function AppleWalletForm({ state, scope }: { state: IntegrationState; scope: Scope }) {
  const t = useTranslations("integ");
  const [res, action] = useActionState(saveIntegration.bind(null, scope, "apple_wallet"), null);
  const [cert, setCert] = useState("");
  const [certName, setCertName] = useState("");
  const [teamId, setTeamId] = useState(state?.config.teamId ?? "");
  const [passType, setPassType] = useState(state?.config.passTypeIdentifier ?? "");
  const [csrPending, startCsr] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  async function readCert(file?: File) {
    if (!file) return;
    const buf = new Uint8Array(await file.arrayBuffer());
    const text = new TextDecoder().decode(buf);
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]!);
    const value = text.includes("-----BEGIN") ? text : btoa(bin);
    setCert(value);
    setCertName(file.name);
    const id = await readAppleCertificate(scope, value);
    if (id.passTypeIdentifier) setPassType(id.passTypeIdentifier);
    if (id.teamId) setTeamId(id.teamId);
  }
  function downloadCsr() {
    startCsr(async () => {
      const r = await generateAppleCsr(scope);
      if (!r.ok) { toast.error(t("errors.generic")); return; }
      const url = URL.createObjectURL(new Blob([r.csr], { type: "application/pkcs10" }));
      const a = document.createElement("a");
      a.href = url; a.download = "VAYRO.certSigningRequest"; a.click();
      URL.revokeObjectURL(url);
      toast.success(t("apple.csrDone"));
    });
  }
  return (
    <Shell icon={<Apple className="size-6" />} title={t("apple.title")} desc={t("apple.desc")} state={state} scope={scope} provider="apple_wallet">
      <ol className="mb-6 space-y-3 rounded-2xl bg-surface-muted p-4 text-sm">
        <li className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink-900 text-xs font-bold text-lime-300">1</span>
          <div className="flex-1"><p className="font-medium">{t("apple.step1")}</p><p className="mt-0.5 text-fg-muted">{t("apple.step1Hint")}</p>
            <Button type="button" size="sm" variant="secondary" className="mt-2" loading={csrPending} onClick={downloadCsr}><Download />{t("apple.csrButton")}</Button></div></li>
        <li className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink-900 text-xs font-bold text-lime-300">2</span>
          <div className="flex-1"><p className="font-medium">{t("apple.step2")}</p><p className="mt-0.5 text-fg-muted">{t("apple.step2Hint")}</p>
            <a href="https://developer.apple.com/account/resources/identifiers/list/passTypeId" target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-fg underline underline-offset-4">developer.apple.com<ExternalLink className="size-3.5" /></a></div></li>
        <li className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink-900 text-xs font-bold text-lime-300">3</span>
          <div className="flex-1"><p className="font-medium">{t("apple.step3")}</p><p className="mt-0.5 text-fg-muted">{t("apple.step3Hint")}</p></div></li>
      </ol>
      <ActionForm action={action} className="space-y-4" autoComplete="off">
        <FormAlert>{res?.error ? t(`errors.${res.error}` as "errors.generic") : null}</FormAlert>
        <FormAlert tone="success">{res?.ok ? t("saved") : null}</FormAlert>
        <input type="hidden" name="certificate" value={cert} />
        <Field label={t("apple.cert")} htmlFor="a-cert" hint={state?.hints.certificate && !cert ? `${t("secretSaved", { hint: state.hints.certificate })} · ${t("keepSecret")}` : t("apple.certHint")}>
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-border-strong p-3">
            <FileUp className="size-5 text-fg-subtle" /><span className="flex-1 truncate text-sm">{certName || "—"}</span>
            <input id="a-cert" ref={fileRef} type="file" accept=".cer,.p12,.pfx,.pem,.crt" className="hidden" onChange={(e) => readCert(e.target.files?.[0])} />
            <Button type="button" size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>{t("apple.file")}</Button>
          </div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("apple.teamId")} htmlFor="a-team" hint={t("apple.teamHint")}><Input id="a-team" name="teamId" required maxLength={10} value={teamId} onChange={(e) => setTeamId(e.target.value.toUpperCase())} className="font-mono uppercase" dir="ltr" /></Field>
          <Field label={t("apple.passType")} htmlFor="a-pass" hint={t("apple.passTypeHint")}><Input id="a-pass" name="passTypeIdentifier" required value={passType} onChange={(e) => setPassType(e.target.value.trim())} className="font-mono" dir="ltr" /></Field>
        </div>
        <details className="rounded-xl border border-border p-3 text-sm">
          <summary className="cursor-pointer font-medium text-fg-muted">{t("apple.advanced")}</summary>
          <div className="mt-3 space-y-4">
            <Field label={t("apple.key")} htmlFor="a-key" hint={t("apple.keyHint")}><Textarea id="a-key" name="privateKey" placeholder="-----BEGIN PRIVATE KEY-----" className="min-h-20 font-mono text-xs [-webkit-text-security:disc]" dir="ltr" spellCheck={false} autoComplete="off" /></Field>
            <Field label={t("apple.password")} htmlFor="a-pass-word" hint={state ? t("keepSecret") : t("apple.passwordHint")}><PasswordInput id="a-pass-word" name="password" autoComplete="new-password" /></Field>
          </div>
        </details>
        <div className="flex justify-end"><SubmitButton>{t("save")}</SubmitButton></div>
      </ActionForm>
    </Shell>
  );
}
