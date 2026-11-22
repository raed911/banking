"use client";
import * as React from "react";
import * as T from "@radix-ui/react-tooltip";

export const TooltipProvider = T.Provider;

export function Tooltip({ content, children, side = "top" }: { content: React.ReactNode; children: React.ReactNode; side?: "top" | "right" | "bottom" | "left" }) {
  return (
    <T.Root delayDuration={200}>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content side={side} sideOffset={6} className="z-50 rounded-md bg-ink-900 px-2 py-1 text-xs font-medium text-white shadow-lg data-[state=delayed-open]:animate-fade-in dark:bg-white dark:text-ink-900">
          {content}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
