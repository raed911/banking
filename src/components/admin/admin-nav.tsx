"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Building2, CreditCard, Inbox, LayoutGrid, Plug, Radar, ScrollText, Tags } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const ITEMS = [
  { key: "overview", href: "/admin", icon: LayoutGrid },
  { key: "merchants", href: "/admin/merchants", icon: Building2 },
  { key: "payments", href: "/admin/payments", icon: CreditCard },
  { key: "plans", href: "/admin/plans", icon: Tags },
  { key: "geo", href: "/admin/location-marketing", icon: Radar },
  { key: "integrations", href: "/admin/integrations", icon: Plug },
  { key: "messages", href: "/admin/messages", icon: Inbox },
  { key: "logs", href: "/admin/logs", icon: ScrollText },
] as const;

export function AdminNav() {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  return (
    <>
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-[248px] flex-col border-e border-white/5 bg-ink-950 text-white lg:flex">
        <div className="flex h-16 items-center gap-2 px-5"><Logo tone="light" size={26} /></div>
        <div className="mx-3 mb-4 rounded-xl bg-lime-300 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-ink-900">{t("badge")}</div>
        <nav className="flex-1 space-y-0.5 px-3">
          {ITEMS.map((i) => (
            <Link key={i.key} href={i.href} className={cn("flex h-9 items-center gap-3 rounded-lg px-3 text-sm transition", active(i.href) ? "bg-white/[0.08] font-medium text-white" : "text-ink-300 hover:bg-white/[0.04] hover:text-white")}>
              <i.icon className={cn("size-[17px]", active(i.href) ? "text-lime-300" : "text-ink-400")} />{t(`nav.${i.key}`)}
            </Link>
          ))}
        </nav>
        <Link href="/dashboard" className="m-3 flex h-9 items-center gap-2 rounded-lg px-3 text-sm text-ink-300 hover:bg-white/[0.04] hover:text-white"><ArrowLeft className="size-4 rtl:rotate-180" />{t("backToApp")}</Link>
      </aside>
      <header className="sticky top-0 z-30 border-b border-white/5 bg-ink-950 text-white lg:hidden">
        <div className="flex h-14 items-center justify-between px-4"><Logo tone="light" size={24} /><span className="rounded-md bg-lime-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-900">{t("badge")}</span></div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {ITEMS.map((i) => <Link key={i.key} href={i.href} className={cn("shrink-0 rounded-lg px-3 py-1.5 text-sm", active(i.href) ? "bg-lime-300 font-medium text-ink-900" : "text-ink-300")}>{t(`nav.${i.key}`)}</Link>)}
          <Link href="/dashboard" className="shrink-0 rounded-lg px-3 py-1.5 text-sm text-ink-400">{t("backToApp")}</Link>
        </nav>
      </header>
    </>
  );
}
