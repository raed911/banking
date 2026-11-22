import { Coffee, Croissant, Heart, Pizza, Scissors, ShoppingBag, Sparkles, Star, IceCream, Dumbbell, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const STAMP_ICONS: Record<string, LucideIcon> = {
  coffee: Coffee, croissant: Croissant, pizza: Pizza, scissors: Scissors, bag: ShoppingBag,
  star: Star, heart: Heart, sparkles: Sparkles, icecream: IceCream, dumbbell: Dumbbell,
};

export interface WalletCardProps {
  merchantName: string;
  programName: string;
  type: "stamps" | "points" | "visits";
  stampsRequired?: number | null;
  balance?: number;
  customerName?: string;
  rewardTitle?: string | null;
  backgroundColor?: string;
  foregroundColor?: string;
  labelColor?: string;
  accentColor?: string;
  logoUrl?: string | null;
  stripUrl?: string | null;
  stampIcon?: string;
  serial?: string;
  qr?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

/** Apple/Google Wallet-style loyalty pass preview. Pure presentational, used everywhere. */
export function WalletCard({
  merchantName, programName, type, stampsRequired = 10, balance = 0, customerName, rewardTitle,
  backgroundColor = "#101828", foregroundColor = "#FFFFFF", labelColor = "#C6F36B", accentColor = "#C6F36B",
  logoUrl, stripUrl, stampIcon = "coffee", serial, qr, className, compact,
}: WalletCardProps) {
  const Icon = STAMP_ICONS[stampIcon] ?? Coffee;
  const total = Math.max(1, Math.min(stampsRequired ?? 10, 20));
  const filled = Math.min(balance, total);
  const unit = type === "points" ? "points" : type === "visits" ? "visites" : "tampons";

  return (
    <div
      dir="ltr"
      className={cn("relative w-full max-w-[340px] overflow-hidden rounded-[22px] shadow-xl ring-1 ring-black/5", className)}
      style={{ backgroundColor, color: foregroundColor }}
    >
      <div className="pointer-events-none absolute -end-20 -top-24 size-56 rounded-full opacity-20 blur-3xl" style={{ backgroundColor: accentColor }} />
      {/* header */}
      <div className="relative flex items-center justify-between gap-3 px-5 pt-4">
        <div className="flex min-w-0 items-center gap-2.5">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="size-8 rounded-lg object-cover" />
          ) : (
            <span className="grid size-8 place-items-center rounded-lg text-sm font-bold" style={{ backgroundColor: accentColor, color: backgroundColor }}>
              {merchantName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="truncate text-[15px] font-semibold tracking-tight">{merchantName}</span>
        </div>
        <div className="text-end">
          <div className="text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ color: labelColor }}>{unit}</div>
          <div className="tabular text-lg font-semibold leading-tight">{type === "points" ? balance : `${filled}/${total}`}</div>
        </div>
      </div>

      {/* strip / stamps */}
      <div className="relative mt-4">
        {stripUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={stripUrl} alt="" className="h-28 w-full object-cover" />
        ) : type === "points" ? (
          <div className="flex h-28 flex-col justify-center px-5" style={{ background: `linear-gradient(120deg, ${accentColor}26, transparent 70%)` }}>
            <span className="font-display text-5xl leading-none">{balance.toLocaleString("fr-FR")}</span>
            <span className="mt-1 text-xs opacity-70">points disponibles</span>
          </div>
        ) : (
          <div className={cn("grid gap-2 px-5 py-3", total <= 6 ? "grid-cols-6" : total <= 10 ? "grid-cols-5" : "grid-cols-7")} aria-label={`${filled} sur ${total}`}>
            {Array.from({ length: total }, (_, i) => {
              const on = i < filled;
              return (
                <span
                  key={i}
                  className="grid aspect-square place-items-center rounded-full border transition-all duration-500"
                  style={{
                    borderColor: on ? accentColor : `${foregroundColor}33`,
                    backgroundColor: on ? accentColor : "transparent",
                    color: on ? backgroundColor : `${foregroundColor}55`,
                    transitionDelay: `${i * 40}ms`,
                  }}
                >
                  <Icon className="size-[45%]" strokeWidth={2.2} />
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* fields */}
      {!compact && (
        <div className="relative grid grid-cols-2 gap-3 px-5 pt-3">
          <div className="min-w-0">
            <div className="text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ color: labelColor }}>Membre</div>
            <div className="truncate text-sm font-medium">{customerName ?? "Votre nom"}</div>
          </div>
          <div className="min-w-0 text-end">
            <div className="text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ color: labelColor }}>Récompense</div>
            <div className="truncate text-sm font-medium">{rewardTitle ?? programName}</div>
          </div>
        </div>
      )}

      {/* barcode */}
      <div className="relative flex flex-col items-center px-5 pb-5 pt-4">
        <div className="grid size-[104px] place-items-center rounded-xl bg-white p-2 text-ink-900">
          {qr ?? <FakeQr />}
        </div>
        {serial && <div className="mt-2 font-mono text-[10px] tracking-[0.2em] opacity-60">{serial}</div>}
      </div>
    </div>
  );
}

/** Decorative QR placeholder for previews (never scannable). */
function FakeQr() {
  const cells = Array.from({ length: 81 }, (_, i) => ((i * 7919) % 13) % 3 === 0);
  return (
    <div className="grid size-full grid-cols-9 gap-px" aria-hidden>
      {cells.map((on, i) => (
        <span key={i} className={cn("rounded-[1px]", on || [0, 1, 9, 10, 7, 8, 16, 17, 63, 64, 72, 73].includes(i) ? "bg-ink-900" : "bg-transparent")} />
      ))}
    </div>
  );
}
