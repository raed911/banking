import { cn } from "@/lib/utils";

/** VAYRO mark: two interlocking lime arrows in a navy tile (loyalty that comes back around). */
export function LogoMark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden className={className}>
      <rect x="0.75" y="0.75" width="38.5" height="38.5" rx="10" fill="#101828" stroke="#C6F36B" strokeOpacity="0.35" strokeWidth="1.5" />
      <path d="M11 12.5h12.2l-3.4-3.4L22 7l7 7-7 7-2.2-2.1 3.4-3.4H11z" fill="#C6F36B" />
      <path d="M29 27.5H16.8l3.4 3.4L18 33l-7-7 7-7 2.2 2.1-3.4 3.4H29z" fill="#C6F36B" />
    </svg>
  );
}

export function Logo({ className, tone = "dark", size = 32 }: { className?: string; tone?: "dark" | "light"; size?: number }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      <span className={cn("text-[15px] font-semibold tracking-[0.32em]", tone === "light" ? "text-white" : "text-fg")}>VAYRO</span>
    </span>
  );
}
