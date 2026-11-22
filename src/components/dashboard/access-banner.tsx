import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AlertTriangle, Sparkles } from "lucide-react";
import type { AccessState } from "@/lib/merchant";
import { cn } from "@/lib/utils";

export async function AccessBanner({ state, daysLeft, canBill }: { state: AccessState; daysLeft?: number; canBill: boolean }) {
  if (state === "ok") return null;
  const t = await getTranslations("dash.trial");
  const trial = state === "trialing";
  const text = trial ? t("trialing", { days: daysLeft ?? 0 }) : state === "past_due" ? t("pastDue") : state === "suspended" ? t("suspended") : t("expired");
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm", trial ? "border border-lime-300/60 bg-lime-50 text-lime-900 dark:bg-lime-300/10 dark:text-lime-200" : "border border-warning-500/30 bg-warning-50 text-warning-700")}>
      <span className="flex items-center gap-2 font-medium">{trial ? <Sparkles className="size-4" /> : <AlertTriangle className="size-4" />}{text}</span>
      {canBill && state !== "suspended" && (
        <Link href="/dashboard/billing" className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold transition", trial ? "bg-ink-900 text-white hover:bg-ink-800" : "bg-warning-500 text-white hover:bg-warning-700")}>{t("cta")}</Link>
      )}
    </div>
  );
}
