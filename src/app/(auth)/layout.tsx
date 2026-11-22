import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { WalletCard } from "@/components/loyalty/wallet-card";
import { LocaleSwitcher } from "@/components/locale-switcher";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("auth");
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-4 py-6 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="VAYRO"><Logo /></Link>
          <LocaleSwitcher />
        </div>
        <main className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12">{children}</main>
        <p className="text-center text-xs text-fg-subtle">© {new Date().getFullYear()} VAYRO</p>
      </div>

      <aside className="relative hidden overflow-hidden bg-ink-900 lg:block">
        <div className="bg-grid absolute inset-0" />
        <div className="absolute -start-24 top-1/3 size-[420px] rounded-full bg-lime-300/10 blur-[100px]" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white xl:p-16">
          <p className="font-script text-4xl text-lime-300">VAYRO</p>
          <div className="relative mx-auto w-full max-w-[360px]">
            <div className="absolute -start-10 top-10 w-[300px] rotate-[-8deg] opacity-60 blur-[1px]">
              <WalletCard merchantName="Pâtisserie Yasmine" programName="Carte douceur" type="points" balance={1240} backgroundColor="#C6F36B" foregroundColor="#101828" labelColor="#101828" accentColor="#101828" compact />
            </div>
            <div className="relative animate-float rotate-[3deg]">
              <WalletCard merchantName="Café Lumière" programName="Carte café" type="stamps" stampsRequired={10} balance={7} customerName="Leila B." rewardTitle="Café offert" serial="VY7K-29QM" />
            </div>
          </div>
          <div>
            <blockquote className="max-w-md text-2xl font-medium leading-snug tracking-[-0.02em]">{t("panelQuote")}</blockquote>
            <div className="mt-8 flex flex-wrap gap-2 text-sm">
              {[t("panelStat1"), t("panelStat2"), t("panelStat3")].map((s) => (
                <span key={s} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-ink-200">{s}</span>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
