"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormAlert } from "@/components/forms/form-alert";
import { createClient } from "@/lib/supabase/client";

export function MfaChallenge({ next }: { next: string }) {
  const t = useTranslations("account");
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(false);
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    const factor = data?.totp.find((f) => f.status === "verified");
    const res = factor ? await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code }) : { error: true };
    setBusy(false);
    if (res.error) { setError(true); setCode(""); return; }
    router.replace(next);
    router.refresh();
  }
  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <FormAlert>{error ? t("errors.invalid_code") : null}</FormAlert>
      <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" autoFocus placeholder="••••••" className="h-14 text-center font-mono text-2xl tracking-[0.5em]" aria-label={t("code")} dir="ltr" />
      <Button type="submit" size="lg" className="w-full" loading={busy} disabled={code.length !== 6}>{t("continue")}</Button>
    </form>
  );
}
