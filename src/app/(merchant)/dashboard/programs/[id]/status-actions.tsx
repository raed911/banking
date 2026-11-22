"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Archive, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setProgramStatus } from "@/features/programs/actions";

export function ProgramStatusActions({ programId, status }: { programId: string; status: string }) {
  const t = useTranslations("programs.form");
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (s: "active" | "paused" | "archived") => start(async () => { await setProgramStatus(programId, s); if (s === "archived") router.push("/dashboard/programs"); });
  return (
    <div className="flex gap-2">
      {status === "active" ? (
        <Button variant="secondary" size="sm" loading={pending} onClick={() => run("paused")}><Pause />{t("pause")}</Button>
      ) : (
        <Button size="sm" loading={pending} onClick={() => run("active")}><Play />{t("activate")}</Button>
      )}
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => confirm(t("archiveConfirm")) && run("archived")}><Archive />{t("archive")}</Button>
    </div>
  );
}
