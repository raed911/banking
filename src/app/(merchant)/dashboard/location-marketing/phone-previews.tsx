"use client";
import { useTranslations } from "next-intl";
import { Wallet } from "lucide-react";

/** Illustrative previews of how the OS may surface the pass (the OS controls the real rendering and timing). */
export function PhonePreviews({ merchant, message }: { merchant: string; message: string }) {
  const t = useTranslations("geo.zone");
  return (
    <div>
      <div className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-fg-subtle">{t("preview")}</div>
      <div className="grid grid-cols-2 gap-3" dir="ltr">
        <div className="relative h-56 overflow-hidden rounded-[28px] bg-gradient-to-b from-ink-800 via-ink-900 to-ink-950 p-3 text-white ring-4 ring-ink-900">
          <div className="text-center text-[10px] text-ink-300">Apple</div>
          <div className="mt-1 text-center font-display text-4xl leading-none">9:41</div>
          <div className="mt-6 rounded-2xl bg-white/15 p-2.5 backdrop-blur">
            <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wide text-ink-200"><span className="grid size-4 place-items-center rounded bg-black"><Wallet className="size-2.5 text-white" /></span>WALLET · {t("now")}</div>
            <div className="mt-1 truncate text-[11px] font-semibold">{merchant}</div>
            <div className="line-clamp-3 text-[11px] leading-snug text-ink-100">{message}</div>
          </div>
        </div>
        <div className="relative h-56 overflow-hidden rounded-[28px] bg-[#eef1f4] p-3 text-ink-900 ring-4 ring-ink-200">
          <div className="text-center text-[10px] text-ink-500">Android</div>
          <div className="mt-2 rounded-2xl bg-white p-2.5 shadow-sm">
            <div className="flex items-center gap-1.5 text-[9px] text-ink-500"><span className="grid size-4 place-items-center rounded-full bg-[#1a73e8]"><Wallet className="size-2.5 text-white" /></span>Google Wallet · {t("nearby")}</div>
            <div className="mt-1 truncate text-[11px] font-semibold">{merchant}</div>
            <div className="line-clamp-3 text-[11px] leading-snug text-ink-600">{t("androidBody")}</div>
          </div>
          <p className="absolute inset-x-3 bottom-3 text-center text-[9px] text-ink-500">{t("androidNote")}</p>
        </div>
      </div>
    </div>
  );
}
