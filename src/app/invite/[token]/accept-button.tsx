"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { acceptInvitation } from "@/features/team/actions";
import { Button } from "@/components/ui/button";

export function AcceptButton({ token, label }: { token: string; label: string }) {
  const t = useTranslations("team.accept");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="mt-6">
      <Button size="lg" variant="accent" loading={pending} onClick={() => start(async () => { const r = await acceptInvitation(token); if (r.error) setError(r.error); else router.push("/dashboard"); })}>{label}</Button>
      {error && <p role="alert" className="mt-3 text-sm text-danger-700">{t(error === "expired" ? "expired" : "invalid")}</p>}
    </div>
  );
}
