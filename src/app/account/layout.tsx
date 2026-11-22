import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { requireUser } from "@/lib/auth/session";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await requireUser("/account");
  const t = await getTranslations("account");
  return (
    <div className="min-h-dvh">
      <header className="border-b border-border bg-surface"><div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4"><Logo /><Link href="/dashboard" className="flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg"><ArrowLeft className="size-4 rtl:rotate-180" />{t("back")}</Link></div></header>
      <main className="mx-auto max-w-3xl px-4 py-10">{children}</main>
    </div>
  );
}
