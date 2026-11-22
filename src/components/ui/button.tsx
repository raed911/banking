import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

export const buttonVariants = cva(
  "relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap font-medium tracking-[-0.01em] transition-[background,color,box-shadow,transform,border-color] duration-200 ease-[var(--ease-out-expo)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--ring)] [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-ink-900 text-white shadow-sm hover:bg-ink-800 dark:bg-lime-300 dark:text-ink-900 dark:hover:bg-lime-200",
        accent: "bg-lime-300 text-ink-900 shadow-[inset_0_-1px_0_rgb(0_0_0/0.12)] hover:bg-lime-200 hover:shadow-glow",
        secondary: "border border-border-strong bg-surface text-fg shadow-xs hover:bg-surface-muted",
        ghost: "text-fg-muted hover:bg-surface-sunken hover:text-fg",
        danger: "bg-danger-500 text-white shadow-sm hover:bg-danger-700",
        link: "h-auto px-0 text-fg underline-offset-4 hover:underline",
        glass: "border border-white/15 bg-white/5 text-white backdrop-blur hover:bg-white/10",
      },
      size: {
        xs: "h-7 rounded-sm px-2.5 text-xs",
        sm: "h-9 rounded-md px-3.5 text-sm",
        md: "h-10 rounded-lg px-4 text-sm",
        lg: "h-12 rounded-xl px-6 text-[15px]",
        xl: "h-14 rounded-2xl px-8 text-base",
        icon: "size-9 rounded-md",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
        {asChild ? children : (
          <>
            {loading && <Spinner className="absolute" />}
            <span className={cn("inline-flex items-center gap-2", loading && "invisible")}>{children}</span>
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";
