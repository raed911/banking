"use client";
import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

export const Label = React.forwardRef<React.ElementRef<typeof LabelPrimitive.Root>, React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>>(
  ({ className, ...props }, ref) => <LabelPrimitive.Root ref={ref} className={cn("text-[13px] font-medium text-fg", className)} {...props} />,
);
Label.displayName = "Label";

interface FieldProps {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  htmlFor?: string;
  optional?: string;
  className?: string;
  children: React.ReactNode;
}

export function Field({ label, hint, error, htmlFor, optional, className, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <div className="flex items-baseline justify-between">
          <Label htmlFor={htmlFor}>{label}</Label>
          {optional && <span className="text-xs text-fg-subtle">{optional}</span>}
        </div>
      )}
      {children}
      {error ? (
        <p role="alert" className="animate-fade-in text-xs font-medium text-danger-500">{error}</p>
      ) : hint ? (
        <p className="text-xs text-fg-muted">{hint}</p>
      ) : null}
    </div>
  );
}
