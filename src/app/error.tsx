"use client";
import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("common");
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <ErrorState title={t("somethingWrong")} description={t("somethingWrongDesc")} action={<Button onClick={reset}>{t("retry")}</Button>} className="w-full max-w-md" />
    </main>
  );
}
