import * as React from "react";
import { cn } from "@/lib/utils";

export const fieldBase =
  "w-full rounded-lg border border-border-strong bg-surface px-3.5 text-sm text-fg shadow-xs transition-[border-color,box-shadow] duration-150 placeholder:text-fg-subtle hover:border-ink-300 focus:border-ink-900 focus:outline-none focus:ring-4 focus:ring-[var(--ring)] disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70 aria-[invalid=true]:border-danger-500 aria-[invalid=true]:focus:ring-danger-500/15 dark:focus:border-lime-300";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, leading, trailing, ...props }, ref) => {
  if (!leading && !trailing) return <input ref={ref} className={cn(fieldBase, "h-10", className)} {...props} />;
  return (
    <div className="relative flex items-center">
      {leading && <span className="pointer-events-none absolute start-3 flex text-fg-subtle [&_svg]:size-4">{leading}</span>}
      <input ref={ref} className={cn(fieldBase, "h-10", leading && "ps-9", trailing && "pe-10", className)} {...props} />
      {trailing && <span className="absolute end-2 flex">{trailing}</span>}
    </div>
  );
});
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={cn(fieldBase, "min-h-24 py-2.5", className)} {...props} />,
);
Textarea.displayName = "Textarea";
