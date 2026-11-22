"use client";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Globe } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { localeNames, locales } from "@/i18n/config";
import { setLocale } from "@/i18n/actions";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({ className, tone = "default" }: { className?: string; tone?: "default" | "light" }) {
  const current = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition", tone === "light" ? "text-ink-200 hover:bg-white/10" : "text-fg-muted hover:bg-surface-sunken hover:text-fg", pending && "opacity-60", className)}>
        <Globe className="size-4" />
        {current.toUpperCase()}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((l) => (
          <DropdownMenuItem key={l} onSelect={() => start(async () => { await setLocale(l); router.refresh(); })} className={cn(l === current && "font-semibold")}>
            {localeNames[l]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
