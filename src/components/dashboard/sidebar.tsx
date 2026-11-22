"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ShieldHalf } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { can } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { NAV, SCAN_ITEM, isActive } from "./nav";
import { WorkspaceSwitcher, type WorkspaceOption } from "./workspace-switcher";
import { UserMenu } from "./user-menu";

export interface ShellProps {
  permissions: string[];
  workspaces: WorkspaceOption[];
  activeId: string;
  user: { name: string; email: string };
  isAdmin: boolean;
}

export function Sidebar({ permissions, workspaces, activeId, user, isAdmin }: ShellProps) {
  const t = useTranslations("dash.nav");
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 start-0 z-30 hidden w-[264px] flex-col bg-ink-900 text-white lg:flex">
      <div className="flex h-16 items-center px-5"><Link href="/dashboard"><Logo tone="light" size={28} /></Link></div>
      <div className="px-3"><WorkspaceSwitcher workspaces={workspaces} activeId={activeId} /></div>
      {can(permissions, "cards.earn") && (
        <div className="px-3 pt-3">
          <Link href={SCAN_ITEM.href} className="group flex h-10 items-center justify-center gap-2 rounded-xl bg-lime-300 text-sm font-semibold text-ink-900 transition hover:bg-lime-200 hover:shadow-glow">
            <SCAN_ITEM.icon className="size-4 transition group-hover:scale-110" />{t("scanner")}
          </Link>
        </div>
      )}
      <nav className="mt-4 flex-1 space-y-5 overflow-y-auto px-3 pb-4 [scrollbar-width:thin]">
        {NAV.map((group) => {
          const items = group.items.filter((i) => !i.perm || can(permissions, i.perm));
          if (!items.length) return null;
          return (
            <div key={group.key ?? "root"}>
              {group.key && <div className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-500">{t(group.key)}</div>}
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <li key={item.key}>
                      <Link href={item.href} aria-current={active ? "page" : undefined}
                        className={cn("relative flex h-9 items-center gap-3 rounded-lg px-3 text-sm transition-colors", active ? "bg-white/[0.08] font-medium text-white" : "text-ink-300 hover:bg-white/[0.04] hover:text-white")}>
                        {active && <span className="absolute inset-y-2 start-0 w-[3px] rounded-full bg-lime-300" />}
                        <item.icon className={cn("size-[17px]", active ? "text-lime-300" : "text-ink-400")} />
                        {t(item.key)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
        {isAdmin && (
          <Link href="/admin" className="flex h-9 items-center gap-3 rounded-lg border border-dashed border-white/15 px-3 text-sm text-ink-300 transition hover:border-lime-300/50 hover:text-white">
            <ShieldHalf className="size-[17px] text-lime-300" />{t("admin")}
          </Link>
        )}
      </nav>
      <div className="border-t border-white/[0.06] p-3"><UserMenu user={user} /></div>
    </aside>
  );
}
