"use client";
import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export const Switch = React.forwardRef<React.ElementRef<typeof SwitchPrimitive.Root>, React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn("peer inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-ink-200 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-ink-900 dark:bg-ink-700 dark:data-[state=checked]:bg-lime-300", className)}
    {...props}
  >
    <SwitchPrimitive.Thumb className="pointer-events-none block size-5 rounded-full bg-white shadow-md transition-transform duration-200 ease-[var(--ease-spring)] data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0.5 rtl:data-[state=checked]:-translate-x-4 rtl:data-[state=unchecked]:-translate-x-0.5 data-[state=checked]:bg-lime-300 dark:data-[state=checked]:bg-ink-900" />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";
