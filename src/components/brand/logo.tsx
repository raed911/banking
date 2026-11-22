import { cn } from "@/lib/utils";

/** Official VAYRO mark (owner-provided artwork, vectorized): lime folded "Z" on Midnight Navy. */
export function LogoMark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="76 76 1780 1780" aria-hidden className={className}>
      <rect x="76" y="76" width="1780" height="1780" rx="400" fill="#101828" />
      <rect x="96" y="96" width="1740" height="1740" rx="380" fill="none" stroke="#C6F36B" strokeOpacity="0.28" strokeWidth="40" />
      <g fill="#C6F36B">
        <path d="M568 254 869 598 435 737Z" />
        <path d="M869 598 1301 463 1604 807 1169 947 1062 1333 629 1468 328 1124 762 984Z" />
        <path d="M1065 1334 1500 1194 1366 1678Z" />
      </g>
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
