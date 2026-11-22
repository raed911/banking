"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Globe, LogOut, MoreHorizontal, UserCog } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { signOut } from "@/features/auth/actions";
import { setLocale } from "@/i18n/actions";
import { localeNames, locales } from "@/i18n/config";
import { cn } from "@/lib/utils";

export function UserMenu({ user, tone = "dark" }: { user: { name: string; email: string }; tone?: "dark" | "light" }) {
  const t = useTranslations("dash.user");
  const locale = useLocale();
  const router = useRouter();
  const [, start] = useTransition();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn("flex w-full items-center gap-3 rounded-xl p-2 text-start transition", tone === "dark" ? "hover:bg-white/[0.06]" : "hover:bg-surface-sunken")}>
        <Avatar name={user.name} size={32} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{user.name}</span>
          <span className={cn("block truncate text-xs", tone === "dark" ? "text-ink-400" : "text-fg-muted")}>{user.email}</span>
        </span>
        <MoreHorizontal className="size-4 text-ink-400" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-[240px]">
        <DropdownMenuLabel>{t("language")}</DropdownMenuLabel>
        {locales.map((l) => (
          <DropdownMenuItem key={l} onSelect={() => start(async () => { await setLocale(l); router.refresh(); })} className={cn(l === locale && "font-semibold")}>
            <Globe />{localeNames[l]}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/account")}><UserCog />{t("account")}</DropdownMenuItem>
        <DropdownMenuItem danger onSelect={() => start(() => signOut())}><LogOut />{t("signOut")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
