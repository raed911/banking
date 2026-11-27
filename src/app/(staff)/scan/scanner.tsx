"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ArrowLeft, Camera, Check, Flashlight, Gift, Keyboard, Loader2, MapPin, ScanLine, Ticket, X } from "lucide-react";
import type QrScannerType from "qr-scanner";
import { applyCoupon, earn, redeem, resolveCard, type OpResult, type ScannedCard } from "@/features/loyalty/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { can } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type Feedback = { tone: "success" | "error"; text: string; sub?: string } | null;
const LOCATION_KEY = "vayro.scan.location";

export function Scanner({ merchantName, locations, permissions }: { merchantName: string; locations: { id: string; name: string }[]; permissions: string[] }) {
  const t = useTranslations("scan");
  const format = useFormatter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScannerType | null>(null);
  const busy = useRef(false);
  const [mode, setMode] = useState<"camera" | "manual" | "coupon">("camera");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torch, setTorch] = useState<{ available: boolean; on: boolean }>({ available: false, on: false });
  const [cards, setCards] = useState<ScannedCard[] | null>(null);
  const [card, setCard] = useState<ScannedCard | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [manual, setManual] = useState("");
  const [purchase, setPurchase] = useState("");
  const [coupon, setCoupon] = useState("");
  const [pending, start] = useTransition();
  const [locationId, setLocationId] = useState<string | null>(() => {
    if (locations.length === 1) return locations[0]!.id;
    try { const saved = typeof window !== "undefined" ? localStorage.getItem(LOCATION_KEY) : null; return saved && locations.some((l) => l.id === saved) ? saved : null; } catch { return null; }
  });

  const errorText = useCallback((r: { error: string; meta?: Record<string, unknown> }) => {
    const m = r.meta ?? {};
    if (r.error === "cooldown" && m.retry_at) return t("errors.cooldown", { time: format.dateTime(new Date(String(m.retry_at)), { timeStyle: "short" }) });
    if (r.error === "max_per_transaction") return t("errors.max_per_transaction", { max: Number(m.max ?? 0) });
    return t.has(`errors.${r.error}`) ? t(`errors.${r.error}` as "errors.generic") : t("errors.generic");
  }, [t, format]);

  const lookup = useCallback((value: string) => {
    if (busy.current) return;
    busy.current = true;
    setFeedback(null);
    start(async () => {
      const r = await resolveCard(value);
      busy.current = false;
      if (!r.ok) { setFeedback({ tone: "error", text: errorText(r) }); navigator.vibrate?.(200); return; }
      scannerRef.current?.stop();
      navigator.vibrate?.(40);
      if (r.cards.length === 1) setCard(r.cards[0]!); else setCards(r.cards);
    });
  }, [errorText]);

  // camera lifecycle
  useEffect(() => {
    if (mode !== "camera" || card || cards) return;
    let cancelled = false;
    (async () => {
      const { default: QrScanner } = await import("qr-scanner");
      if (cancelled || !videoRef.current) return;
      if (!(await QrScanner.hasCamera())) { setCameraError(t("noCamera")); return; }
      const scanner = new QrScanner(videoRef.current, (res) => lookup(res.data), { preferredCamera: "environment", maxScansPerSecond: 4, returnDetailedScanResult: true });
      scannerRef.current = scanner;
      try {
        await scanner.start();
        setCameraError(null);
        setTorch({ available: await scanner.hasFlash(), on: false });
      } catch {
        setCameraError(t("cameraDenied"));
      }
    })();
    return () => { cancelled = true; scannerRef.current?.destroy(); scannerRef.current = null; };
  }, [mode, card, cards, lookup, t]);

  function reset() { setCard(null); setCards(null); setPurchase(""); setCoupon(""); setFeedback(null); }

  function run(op: () => Promise<OpResult>, success: (d: Record<string, unknown>) => Feedback) {
    start(async () => {
      const r = await op();
      if (!r.ok) { setFeedback({ tone: "error", text: errorText(r) }); navigator.vibrate?.([80, 60, 80]); return; }
      navigator.vibrate?.(60);
      setFeedback(success(r.data));
      if (card && typeof r.data.balance === "number") setCard({ ...card, balance: r.data.balance as number });
    });
  }

  const pointsPreview = card?.program.type === "points" && purchase ? Math.floor(Number(purchase.replace(",", ".")) * Number(card.program.points_per_unit ?? 0)) : 0;

  return (
    <div className="fixed inset-0 flex flex-col bg-ink-950 text-white">
      <header className="relative z-10 flex items-center justify-between px-4 pb-3 pt-[max(env(safe-area-inset-top),1rem)]">
        <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-ink-300 hover:text-white"><ArrowLeft className="size-4 rtl:rotate-180" />{t("back")}</Link>
        <span className="truncate px-3 text-sm font-semibold">{merchantName}</span>
        {locations.length > 1 ? (
          <label className="flex items-center gap-1 text-xs text-ink-300">
            <MapPin className="size-3.5" />
            <select value={locationId ?? ""} onChange={(e) => { setLocationId(e.target.value || null); try { localStorage.setItem(LOCATION_KEY, e.target.value); } catch {} }} className="max-w-[120px] bg-transparent text-white outline-none" aria-label={t("location")}>
              <option value="" className="text-ink-900">{t("location")}</option>
              {locations.map((l) => <option key={l.id} value={l.id} className="text-ink-900">{l.name}</option>)}
            </select>
          </label>
        ) : <span className="w-10" />}
      </header>

      {/* camera / manual */}
      <div className="relative flex-1 overflow-hidden">
        {mode === "camera" ? (
          <>
            <video ref={videoRef} className="absolute inset-0 size-full object-cover" playsInline muted />
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="relative size-[min(72vw,300px)]">
                <div className="absolute inset-0 rounded-[32px] shadow-[0_0_0_100vmax_rgb(10_15_28/0.62)]" />
                {["top-0 start-0 border-t-4 border-s-4 rounded-tl-[32px] rtl:rounded-tl-none rtl:rounded-tr-[32px]", "top-0 end-0 border-t-4 border-e-4 rounded-tr-[32px] rtl:rounded-tr-none rtl:rounded-tl-[32px]", "bottom-0 start-0 border-b-4 border-s-4 rounded-bl-[32px] rtl:rounded-bl-none rtl:rounded-br-[32px]", "bottom-0 end-0 border-b-4 border-e-4 rounded-br-[32px] rtl:rounded-br-none rtl:rounded-bl-[32px]"].map((c) => (
                  <span key={c} className={cn("absolute size-12 border-lime-300", c)} />
                ))}
                <span className="absolute inset-x-6 top-1/2 h-0.5 animate-pulse bg-lime-300/80 shadow-[0_0_20px_4px_rgb(198_243_107/0.5)]" />
              </div>
            </div>
            <p className="absolute inset-x-0 bottom-28 px-6 text-center text-sm text-ink-200">{cameraError ?? t("aim")}</p>
            {torch.available && (
              <button onClick={async () => { await scannerRef.current?.toggleFlash(); setTorch((s) => ({ ...s, on: !s.on })); }} className={cn("absolute end-4 top-4 grid size-11 place-items-center rounded-full backdrop-blur", torch.on ? "bg-lime-300 text-ink-900" : "bg-white/10")} aria-label={t("torch")}><Flashlight className="size-5" /></button>
            )}
          </>
        ) : mode === "coupon" ? (
          <form onSubmit={(e) => { e.preventDefault(); if (coupon.trim().length >= 3) run(() => applyCoupon(null, coupon, crypto.randomUUID(), locationId), (d) => { setCoupon(""); return { tone: "success", text: t("success.coupon", { coupon: String(d.coupon) }) }; }); }} className="mx-auto flex h-full max-w-md flex-col justify-center gap-4 px-6">
            <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-white/5 text-lime-300"><Ticket className="size-7" /></div>
            <p className="text-center text-sm text-ink-300">{t("couponNoCardHint")}</p>
            <Input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} autoFocus dir="ltr" aria-label={t("coupon")} className="h-14 border-white/10 bg-white/5 text-center font-mono text-lg uppercase tracking-widest text-white placeholder:text-ink-500" placeholder="CAFE20" />
            <Button type="submit" variant="accent" size="lg" loading={pending} disabled={coupon.trim().length < 3}>{t("applyCoupon")}</Button>
          </form>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); if (manual.trim()) lookup(manual); }} className="mx-auto flex h-full max-w-md flex-col justify-center gap-4 px-6">
            <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-white/5 text-lime-300"><Keyboard className="size-7" /></div>
            <p className="text-center text-sm text-ink-300">{t("manualHint")}</p>
            <Input value={manual} onChange={(e) => setManual(e.target.value)} autoFocus dir="ltr" className="h-14 border-white/10 bg-white/5 text-center text-lg tracking-widest text-white placeholder:text-ink-500" placeholder="AB23CD45EF" />
            <Button type="submit" variant="accent" size="lg" loading={pending}>{t("search")}</Button>
          </form>
        )}
        {feedback && !card && <div role="status" className={cn("absolute inset-x-4 top-4 animate-fade-up rounded-2xl px-4 py-3 text-sm font-medium shadow-lg", feedback.tone === "success" ? "bg-lime-300 text-ink-900" : "bg-danger-500")}>{feedback.text}</div>}
        {pending && !card && <div className="absolute inset-0 grid place-items-center bg-ink-950/40"><Loader2 className="size-8 animate-spin text-lime-300" /></div>}
      </div>

      {/* mode switch */}
      {!card && (
        <div className="relative z-10 flex flex-wrap justify-center gap-2 px-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-4">
          {(can(permissions, "coupons.redeem") ? (["camera", "manual", "coupon"] as const) : (["camera", "manual"] as const)).map((m) => (
            <button key={m} onClick={() => { setMode(m); setFeedback(null); setCoupon(""); }} className={cn("flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium transition", mode === m ? "bg-white text-ink-900" : "bg-white/10 text-white")}>
              {m === "camera" ? <Camera className="size-4" /> : m === "manual" ? <Keyboard className="size-4" /> : <Ticket className="size-4" />}{m === "coupon" ? t("couponNoCard") : t(m)}
            </button>
          ))}
        </div>
      )}

      {/* multiple cards for one phone number */}
      {cards && !card && (
        <Sheet onClose={reset} title={t("chooseCard")}>
          <div className="space-y-2">
            {cards.map((c) => (
              <button key={c.id} onClick={() => setCard(c)} className="flex w-full items-center justify-between rounded-2xl border border-border p-4 text-start hover:bg-surface-muted">
                <span><span className="block font-semibold">{c.program.name}</span><span className="text-sm text-fg-muted">{c.customer.first_name} {c.customer.last_name ?? ""}</span></span>
                <span className="tabular text-lg font-semibold">{c.balance}</span>
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {/* card actions */}
      {card && (
        <Sheet onClose={reset} title={`${card.customer.first_name} ${card.customer.last_name ?? ""}`.trim()}>
          <div className="space-y-5">
            <div className="flex items-end justify-between rounded-2xl bg-ink-900 p-5 text-white">
              <div><div className="text-xs text-ink-400">{card.program.name}</div><div className="mt-1 text-xs uppercase tracking-[0.14em] text-lime-300">{t("balance")}</div></div>
              <div className="font-display text-5xl leading-none tabular">{card.balance}{card.program.type !== "points" && <span className="text-2xl text-ink-400">/{card.program.stamps_required}</span>}</div>
            </div>
            {card.program.type !== "points" && (
              <div className="flex flex-wrap gap-1.5">{Array.from({ length: card.program.stamps_required ?? 10 }, (_, i) => <span key={i} className={cn("size-5 rounded-full border-2 transition", i < card.balance ? "border-lime-500 bg-lime-300" : "border-border-strong")} />)}</div>
            )}

            {feedback && (
              <div className={cn("flex animate-scale-in items-start gap-3 rounded-2xl p-4", feedback.tone === "success" ? "bg-lime-300 text-ink-900" : "bg-danger-50 text-danger-700")}>
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", feedback.tone === "success" ? "bg-ink-900 text-lime-300" : "bg-danger-500 text-white")}>{feedback.tone === "success" ? <Check className="size-4" /> : <X className="size-4" />}</span>
                <span><span className="block font-semibold">{feedback.text}</span>{feedback.sub && <span className="block text-sm opacity-80">{feedback.sub}</span>}</span>
              </div>
            )}

            {can(permissions, "cards.earn") && (card.program.type === "points" ? (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input value={purchase} onChange={(e) => setPurchase(e.target.value)} inputMode="decimal" placeholder={t("purchase")} className="h-14 text-lg" dir="ltr" />
                  {pointsPreview > 0 && <span className="absolute end-3 top-1/2 -translate-y-1/2 text-sm font-medium text-fg-muted">{t("pointsPreview", { points: pointsPreview })}</span>}
                </div>
                <Button size="xl" disabled={!pointsPreview} loading={pending} onClick={() => run(() => earn(card.id, crypto.randomUUID(), { purchaseTnd: Number(purchase.replace(",", ".")), locationId }), (d) => ({ tone: "success", text: t("success.earn", { amount: Number(d.amount) }) }))}>{t("addPoints")}</Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Input id="scan-amount" value={purchase} onChange={(e) => setPurchase(e.target.value.replace(/[^\d.,]/g, ""))} inputMode="decimal" placeholder={t("amountPaid")} aria-label={t("amountPaid")} className="h-12 pe-14 text-lg" dir="ltr" />
                  <span className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-sm font-medium text-fg-muted">TND</span>
                </div>
                <Button size="xl" variant="accent" className="h-16 w-full text-lg" loading={pending} onClick={() => {
                  const paid = Number(purchase.replace(",", "."));
                  run(() => earn(card.id, crypto.randomUUID(), { amount: 1, locationId, ...(paid > 0 ? { purchaseTnd: paid } : {}) }), (d) => { setPurchase(""); return { tone: "success", text: t("success.earn", { amount: Number(d.amount) }), sub: paid > 0 ? t("amountRecorded", { amount: paid.toFixed(3) }) : undefined }; });
                }}>
                  <ScanLine className="!size-5" />{card.program.type === "visits" ? t("addVisit") : t("addStamp")}
                </Button>
              </div>
            ))}

            {can(permissions, "rewards.redeem") && (
              <div>
                <h3 className="mb-2 text-sm font-semibold">{t("rewards")}</h3>
                {card.rewards.length === 0 ? <p className="text-sm text-fg-muted">{t("noRewards")}</p> : (
                  <ul className="space-y-2">
                    {card.rewards.map((r) => {
                      const ok = card.balance >= r.cost && (r.stock == null || r.stock > 0);
                      return (
                        <li key={r.id} className={cn("flex items-center gap-3 rounded-2xl border p-3", ok ? "border-lime-400 bg-lime-50" : "border-border opacity-60")}>
                          <Gift className="size-5 shrink-0 text-lime-700" />
                          <span className="min-w-0 flex-1"><span className="block truncate font-medium">{r.name}</span><span className="text-xs text-fg-muted">{r.cost}</span></span>
                          <Button size="sm" disabled={!ok || pending} onClick={() => run(() => redeem(card.id, r.id, crypto.randomUUID(), locationId), (d) => ({ tone: "success", text: t("success.redeem", { reward: r.name }), sub: d.redemption_code ? t("success.code", { code: String(d.redemption_code) }) : undefined }))}>{t("redeem")}</Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            {can(permissions, "coupons.redeem") && (
              <form onSubmit={(e) => { e.preventDefault(); if (coupon.trim()) run(() => applyCoupon(card.id, coupon, crypto.randomUUID(), locationId), (d) => ({ tone: "success", text: t("success.coupon", { coupon: String(d.coupon) }) })); }} className="flex gap-2">
                <Input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder={t("coupon")} leading={<Ticket />} className="h-11 uppercase" dir="ltr" />
                <Button type="submit" variant="secondary" size="lg" className="h-11" disabled={!coupon.trim() || pending}>{t("applyCoupon")}</Button>
              </form>
            )}

            <Button variant="primary" size="lg" className="w-full" onClick={reset}><ScanLine />{t("scanNext")}</Button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function Sheet({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex items-end bg-ink-950/60 backdrop-blur-sm animate-fade-in">
      <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[32px] bg-surface p-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] text-fg shadow-xl animate-fade-up sm:mx-auto sm:mb-6 sm:max-w-lg sm:rounded-[32px]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border-strong" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="truncate text-xl font-semibold tracking-[-0.02em]">{title}</h2>
          <button onClick={onClose} className="grid size-9 place-items-center rounded-full bg-surface-sunken" aria-label="Close"><X className="size-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
