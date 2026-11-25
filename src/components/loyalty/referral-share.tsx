"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Share2, UserPlus } from "lucide-react";

/** "Invite a friend" block on the customer card page: native share sheet, WhatsApp, or copy the personal link. */
export function ReferralShare({ url, merchant, reward, invited, completed }: { url: string; merchant: string; reward: number; invited: number; completed: number }) {
  const t = useTranslations("public.card.referral");
  const [copied, setCopied] = useState(false);
  const message = t("message", { merchant });
  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: merchant, text: message, url }); return; } catch { /* closed by the user */ return; }
    }
    await copy();
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ }
  }
  return (
    <section className="mt-6 rounded-3xl border border-border bg-surface p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-lime-300 text-ink-900"><UserPlus className="size-5" /></span>
        <div>
          <h2 className="font-semibold">{t("title")}</h2>
          <p className="mt-0.5 text-sm text-fg-muted">{t("desc", { count: reward })}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={share} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-ink-900 text-sm font-medium text-white active:scale-[0.98]"><Share2 className="size-4" />{t("share")}</button>
        <a href={`https://wa.me/?text=${encodeURIComponent(`${message} ${url}`)}`} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] text-sm font-medium text-white active:scale-[0.98]">WhatsApp</a>
      </div>
      <button type="button" onClick={copy} className="mt-2 flex w-full items-center justify-between gap-2 rounded-xl bg-surface-muted px-3 py-2.5 text-start text-xs text-fg-muted" aria-label={t("copy")}>
        <span className="truncate font-mono" dir="ltr">{url}</span>
        {copied ? <Check className="size-4 shrink-0 text-success-700" /> : <Copy className="size-4 shrink-0" />}
      </button>
      {invited > 0 && <p className="mt-3 text-xs text-fg-muted">{t("stats", { invited, completed })}</p>}
    </section>
  );
}
