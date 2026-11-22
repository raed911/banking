import { cn, initials } from "@/lib/utils";

const palette = ["bg-lime-200 text-lime-900", "bg-ink-900 text-lime-300", "bg-info-50 text-info-700", "bg-warning-50 text-warning-700", "bg-ink-150 text-ink-800"];

export function Avatar({ name, src, size = 32, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const tone = palette[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length];
  return (
    <span className={cn("inline-grid shrink-0 place-items-center overflow-hidden rounded-full text-[11px] font-semibold", tone, className)} style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- small avatar from signed storage URL */}
      {src ? <img src={src} alt="" className="size-full object-cover" /> : initials(name) || "?"}
    </span>
  );
}
