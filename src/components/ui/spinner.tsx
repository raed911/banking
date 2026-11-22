import { cn } from "@/lib/utils";

/** Decorative spinner; the owning control exposes aria-busy, so this stays hidden from assistive tech. */
export function Spinner({ className }: { className?: string }) {
  return <span aria-hidden className={cn("inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent", className)} />;
}
