import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StateProps {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/** Empty state: dotted canvas, floating icon tile, title, guidance and a primary action. */
export function EmptyState({ icon, title, description, action, className }: StateProps) {
  return (
    <div className={cn("relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border-strong bg-surface px-6 py-14 text-center", className)}>
      <div className="bg-grid-ink pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      {icon && (
        <div className="relative mb-5 grid size-14 place-items-center rounded-2xl bg-ink-900 text-lime-300 shadow-lg [&_svg]:size-6 animate-float">
          {icon}
        </div>
      )}
      <h3 className="relative text-base font-semibold tracking-[-0.01em]">{title}</h3>
      {description && <p className="relative mt-1.5 max-w-sm text-sm text-fg-muted">{description}</p>}
      {action && <div className="relative mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ title, description, action, className }: StateProps) {
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center rounded-2xl border border-danger-500/20 bg-danger-50/50 px-6 py-12 text-center dark:bg-danger-500/5", className)}>
      <div className="mb-4 grid size-12 place-items-center rounded-xl bg-danger-500/10 text-danger-500">
        <AlertTriangle className="size-5" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
