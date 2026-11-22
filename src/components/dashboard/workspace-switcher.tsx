"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { switchWorkspace } from "@/features/workspace/actions";
import { cn } from "@/lib/utils";

export type WorkspaceOption = { id: string; name: string; role: string; color: string };

function Mark({ name, color, className }: { name: string; color: string; className?: string }) {
  return <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg text-sm font-bold text-ink-900", className)} style={{ background: color === "#101828" ? "#C6F36B" : color }}>{name.slice(0, 1).toUpperCase()}</span>;
}

export function WorkspaceSwitcher({ workspaces, activeId, tone = "dark" }: { workspaces: WorkspaceOption[]; activeId: string; tone?: "dark" | "light" }) {
  const t = useTranslations("dash.user");
  const router = useRouter();
  const [pending, start] = useTransition();
  const active = workspaces.find((w) => w.id === activeId) ?? workspaces[0];
  if (!active) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn("flex w-full items-center gap-3 rounded-xl p-2 text-start transition", tone === "dark" ? "bg-white/[0.04] hover:bg-white/[0.08]" : "hover:bg-surface-sunken", pending && "opacity-60")}>
        <Mark name={active.name} color={active.color} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{active.name}</span>
          <span className={cn("block truncate text-xs", tone === "dark" ? "text-ink-400" : "text-fg-muted")}>{active.role}</span>
        </span>
        <ChevronsUpDown className={cn("size-4", tone === "dark" ? "text-ink-400" : "text-fg-subtle")} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[240px]">
        <DropdownMenuLabel>{t("switch")}</DropdownMenuLabel>
        {workspaces.map((w) => (
          <DropdownMenuItem key={w.id} onSelect={() => w.id !== activeId && start(async () => { await switchWorkspace(w.id); router.refresh(); })}>
            <Mark name={w.name} color={w.color} className="size-6 text-xs" />
            <span className="flex-1 truncate">{w.name}</span>
            {w.id === activeId && <Check className="!text-fg" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/onboarding?new=1")}><Plus />{t("newWorkspace")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
