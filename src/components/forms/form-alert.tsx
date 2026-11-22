import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function FormAlert({ tone = "error", children, className }: { tone?: "error" | "success"; children: React.ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex animate-fade-in items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm",
      tone === "error" ? "border-danger-500/20 bg-danger-50 text-danger-700 dark:bg-danger-500/10" : "border-success-500/20 bg-success-50 text-success-700 dark:bg-success-500/10", className)}>
      {tone === "error" ? <AlertCircle className="mt-0.5 size-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" />}
      <div>{children}</div>
    </div>
  );
}
