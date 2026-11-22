import { getTranslations } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import { safeNext } from "@/lib/action";
import { MfaChallenge } from "./mfa-challenge";

export default async function MfaPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const t = await getTranslations("account");
  return (
    <div className="mx-auto max-w-sm py-10 text-center">
      <div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl bg-ink-900 text-lime-300"><ShieldCheck className="size-7" /></div>
      <h1 className="text-2xl font-semibold tracking-[-0.03em]">{t("challengeTitle")}</h1>
      <p className="mt-2 text-fg-muted">{t("challengeDesc")}</p>
      <MfaChallenge next={safeNext((await searchParams).next)} />
    </div>
  );
}
