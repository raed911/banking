"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { CreditCard, LayoutGrid, Menu, ScanLine, Users, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { can } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { NAV, isActive } from "./nav";
import type { ShellProps } from "./sidebar";
import { UserMenu } from "./user-menu";
import { WorkspaceSwitcher } from "./workspace-switcher";

export function MobileNav({ permissions, workspaces, activeId, user, isAdmin }: ShellProps) {
  const t = useTranslations("dash.nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const tabs = [
    { key: "overview", href: "/dashboard", icon: LayoutGrid },
    { key: "customers", href: "/dashboard/customers", icon: Users },
    ...(can(permissions, "cards.earn") ? [{ key: "scanner", href: "/scan", icon: ScanLine, primary: true }] : []),
    { key: "programs", href: "/dashboard/programs", icon: CreditCard },
  ] as { key: string; href: string; icon: typeof Users; primary?: boolean }[];

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface/85 px-4 backdrop-blur-xl lg:hidden">
        <Link href="/dashboard"><Logo size={26} /></Link>
        <span className="max-w-[45%] truncate text-sm font-medium text-fg-muted">{workspaces.find((w) => w.id === activeId)?.name}</span>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <ul className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
          {tabs.map((tab) => {
            const active = isActive(pathname, tab.href);
            return (
              <li key={tab.key}>
                <Link href={tab.href} className={cn("flex flex-col items-center gap-1 text-[10px] font-medium", tab.primary ? "-mt-6" : active ? "text-fg" : "text-fg-subtle")}>
                  {tab.primary ? (
                    <span className="grid size-14 place-items-center rounded-2xl bg-ink-900 text-lime-300 shadow-lg ring-4 ring-bg"><tab.icon className="size-6" /></span>
                  ) : (
                    <tab.icon className={cn("size-[22px]", active && "text-fg")} strokeWidth={active ? 2.2 : 1.8} />
                  )}
                  {t(tab.key)}
                </Link>
              </li>
            );
          })}
          <li>
            <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
              <DialogPrimitive.Trigger className="flex flex-col items-center gap-1 text-[10px] font-medium text-fg-subtle"><Menu className="size-[22px]" strokeWidth={1.8} />{t("more")}</DialogPrimitive.Trigger>
              <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-ink-950/50 backdrop-blur-sm data-[state=open]:animate-fade-in" />
                <DialogPrimitive.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] overflow-y-auto rounded-t-3xl bg-ink-900 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] text-white data-[state=open]:animate-fade-up">
                  <DialogPrimitive.Title className="sr-only">{t("menu")}</DialogPrimitive.Title>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="mx-auto h-1 w-10 rounded-full bg-white/20" />
                    <DialogPrimitive.Close className="absolute end-4 top-4 grid size-8 place-items-center rounded-lg bg-white/5" aria-label="Close"><X className="size-4" /></DialogPrimitive.Close>
                  </div>
                  <WorkspaceSwitcher workspaces={workspaces} activeId={activeId} />
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {NAV.flatMap((g) => g.items).filter((i) => !i.perm || can(permissions, i.perm)).map((item) => (
                      <Link key={item.key} href={item.href} onClick={() => setOpen(false)} className={cn("flex flex-col items-center gap-2 rounded-2xl p-3 text-center text-xs", isActive(pathname, item.href) ? "bg-lime-300 text-ink-900" : "bg-white/[0.05] text-ink-200")}>
                        <item.icon className="size-5" />{t(item.key)}
                      </Link>
                    ))}
                    {isAdmin && <Link href="/admin" onClick={() => setOpen(false)} className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/20 p-3 text-center text-xs text-ink-200">{t("admin")}</Link>}
                  </div>
                  <div className="mt-4 border-t border-white/10 pt-3"><UserMenu user={user} /></div>
                </DialogPrimitive.Content>
              </DialogPrimitive.Portal>
            </DialogPrimitive.Root>
          </li>
        </ul>
      </nav>
    </>
  );
}
