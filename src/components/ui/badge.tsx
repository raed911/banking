import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium [&_svg]:size-3", {
  variants: {
    tone: {
      neutral: "bg-surface-sunken text-fg-muted",
      lime: "bg-lime-100 text-lime-800 dark:bg-lime-300/15 dark:text-lime-300",
      ink: "bg-ink-900 text-white dark:bg-white dark:text-ink-900",
      success: "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-500",
      warning: "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-500",
      danger: "bg-danger-50 text-danger-700 dark:bg-danger-500/15 dark:text-danger-500",
      info: "bg-info-50 text-info-700 dark:bg-info-500/15 dark:text-info-500",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({ className, tone, dot, children, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants> & { dot?: boolean }) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}
