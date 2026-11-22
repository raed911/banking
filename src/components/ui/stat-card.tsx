import * as React from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  delta?: number | null;
  deltaLabel?: string;
  icon?: React.ReactNode;
  highlight?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function StatCard({ label, value, delta, deltaLabel, icon, highlight, children, className }: StatCardProps) {
  const up = (delta ?? 0) >= 0;
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-5 transition-shadow duration-300 hover:shadow-md",
        highlight ? "border-ink-800 bg-ink-900 text-white" : "border-border bg-surface",
        className,
      )}
    >
      {highlight && <div className="pointer-events-none absolute -end-16 -top-16 size-44 rounded-full bg-lime-300/20 blur-3xl" />}
      <div className="flex items-center justify-between">
        <span className={cn("text-[13px] font-medium", highlight ? "text-ink-300" : "text-fg-muted")}>{label}</span>
        {icon && (
          <span className={cn("grid size-8 place-items-center rounded-lg [&_svg]:size-4", highlight ? "bg-lime-300 text-ink-900" : "bg-surface-sunken text-fg")}>{icon}</span>
        )}
      </div>
      <div className="tabular mt-3 text-[28px] font-semibold leading-none tracking-[-0.03em]">{value}</div>
      {delta != null && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          <span className={cn("inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium", up ? "bg-success-500/10 text-success-500" : "bg-danger-500/10 text-danger-500")}>
            {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
          {deltaLabel && <span className={highlight ? "text-ink-400" : "text-fg-subtle"}>{deltaLabel}</span>}
        </div>
      )}
      {children}
    </div>
  );
}
