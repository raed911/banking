import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { getMemberships, requireUser } from "@/lib/auth/session";
import { OnboardingForm } from "./onboarding-form";

export async function generateMetadata() {
  const t = await getTranslations("onboarding");
  return { title: t("title") };
}

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  await requireUser("/onboarding");
  const { new: forceNew } = await searchParams;
  if (!forceNew && (await getMemberships()).length > 0) redirect("/dashboard");
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="bg-grid-ink pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_60%)]" />
      <div className="container-page relative flex items-center justify-between py-6"><Logo /><LocaleSwitcher /></div>
      <main className="container-page relative flex justify-center pb-16 pt-6 sm:pt-12">
        <OnboardingForm />
      </main>
    </div>
  );
}
