import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("common");
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-ink-900 px-4 text-white">
      <div className="bg-grid pointer-events-none absolute inset-0" />
      <div className="relative text-center">
        <Logo tone="light" className="mb-10 justify-center" />
        <p className="font-display text-[120px] leading-none text-lime-300 sm:text-[180px]">404</p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">{t("notFound")}</h1>
        <p className="mx-auto mt-2 max-w-sm text-ink-300">{t("notFoundDesc")}</p>
        <Button asChild variant="accent" size="lg" className="mt-8">
          <Link href="/">{t("goHome")}</Link>
        </Button>
      </div>
    </main>
  );
}
