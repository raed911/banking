import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Gift, Lock, MapPin, Phone, Sparkles } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { WalletCard } from "@/components/loyalty/wallet-card";
import { LiveQr } from "@/components/loyalty/live-qr";
import { getPublicCard } from "@/lib/loyalty/public-card";
import { publicAssetUrl } from "@/lib/storage";
import { walletAvailability } from "@/lib/integrations";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const data = await getPublicCard((await params).token);
  return { title: data ? `${data.card.merchant?.name} · ${data.card.program?.name}` : "VAYRO" };
}

export default async function CardPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ wallet?: string }> }) {
  const { token } = await params;
  const walletError = (await searchParams).wallet === "error";
  const data = await getPublicCard(token);
  if (!data || !data.card.program || !data.card.merchant) notFound();
  const t = await getTranslations("public.card");
  const format = await getFormatter();
  const { card, design, rewards, history } = data;
  const program = card.program!;
  const merchant = card.merchant!;
  const unit = t(`units.${program.type}`);
  const active = card.status === "active" && merchant.status === "active";
  const next = rewards.find((r) => r.cost > card.balance);
  const ready = rewards.filter((r) => r.cost <= card.balance);
  const bg = design?.background_color ?? "#101828";
  const wallets = await walletAvailability(card.merchant_id);
  // Google Wallet isn't available on iOS: don't offer a button that can't work there.
  const isIos = /iPhone|iPad|iPod/i.test((await headers()).get("user-agent") ?? "");
  const showGoogle = wallets.google && !isIos;

  return (
    <main className="relative mx-auto max-w-md px-4 pb-12">
      <div className="absolute inset-x-0 top-0 h-80 rounded-b-[44px]" style={{ background: bg }} />
      <header className="relative flex items-center justify-between pt-6 text-sm font-medium" style={{ color: design?.foreground_color ?? "#fff" }}>
        <span className="opacity-80">{t("hello", { name: card.customer?.first_name ?? "" })}</span>
        <span className="opacity-60">{t("member", { date: format.dateTime(new Date(card.created_at), { month: "short", year: "numeric" }) })}</span>
      </header>

      <div className="relative mt-5 flex justify-center">
        <WalletCard merchantName={design?.logo_text || merchant.name} programName={program.name} type={program.type} stampsRequired={program.stamps_required}
          balance={card.balance} customerName={card.customer?.first_name} rewardTitle={program.reward_title} serial={card.serial}
          backgroundColor={design?.background_color} foregroundColor={design?.foreground_color} labelColor={design?.label_color} accentColor={design?.accent_color}
          stampIcon={design?.stamp_icon} logoUrl={publicAssetUrl(design?.logo_path ?? merchant.logo_path)} stripUrl={publicAssetUrl(design?.strip_path)}
          qr={active ? <LiveQr token={token} /> : <Lock className="size-8 text-ink-300" />} />
      </div>

      {!active ? (
        <p className="relative mt-6 rounded-2xl bg-warning-50 p-4 text-center text-sm font-medium text-warning-700">{t("unavailable")}</p>
      ) : (
        <>
          <p className="relative mt-5 text-center text-sm font-medium text-fg">{t("showQr")}</p>
          <p className="relative mt-1 text-center text-xs text-fg-muted">{t("qrRefresh")}</p>
        </>
      )}

      {(ready.length > 0 || next) && (
        <section className={cn("mt-6 rounded-3xl p-5", ready.length ? "bg-ink-900 text-white" : "border border-border bg-surface")}>
          {ready.length > 0 ? (
            <p className="flex items-center gap-2 font-semibold"><Sparkles className="size-5 text-lime-300" />{t("rewardReady", { reward: ready[ready.length - 1]!.name })}</p>
          ) : next && (
            <>
              <p className="text-sm font-medium">{t("toNext", { count: next.cost - card.balance, reward: next.name })}</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-sunken"><div className="h-full rounded-full bg-lime-400" style={{ width: `${Math.min(100, (card.balance / next.cost) * 100)}%` }} /></div>
            </>
          )}
        </section>
      )}

      {walletError && <p className="mt-4 rounded-2xl bg-danger-50 p-4 text-sm text-danger-700">{t("walletError")}</p>}
      {active && showGoogle ? (
        <section className="mt-4 space-y-3">
          {/* Route handler redirect (not a page) — plain anchor on purpose */}
          <a href={`/api/wallet/google/${token}`} className="flex h-14 items-center justify-center gap-3 rounded-2xl bg-black text-[15px] font-medium text-white shadow-lg transition active:scale-[0.98]" rel="nofollow">
            <svg viewBox="0 0 24 24" className="size-6" aria-hidden><rect x="2" y="5" width="20" height="14" rx="3" fill="#4285F4" /><rect x="2" y="5" width="20" height="5" rx="2.5" fill="#EA4335" /><rect x="2" y="8" width="20" height="4" fill="#FBBC04" /><rect x="2" y="10.5" width="20" height="3" fill="#34A853" /></svg>
            {t("addGoogle")}
          </a>
          {!wallets.apple && <p className="text-center text-xs text-fg-muted">{t("appleSoon")}</p>}
        </section>
      ) : (
        <section className="mt-4 rounded-3xl border border-border bg-surface p-5 text-sm text-fg-muted">{t("walletSoon")}</section>
      )}

      {rewards.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-fg-subtle">{t("rewards")}</h2>
          <ul className="space-y-2">
            {rewards.map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5">
                <span className={cn("grid size-10 place-items-center rounded-xl", r.cost <= card.balance ? "bg-lime-300 text-ink-900" : "bg-surface-sunken text-fg-muted")}><Gift className="size-5" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate font-medium">{r.name}</span>{r.description && <span className="block truncate text-xs text-fg-muted">{r.description}</span>}</span>
                <span className="tabular text-sm font-semibold">{r.cost} <span className="text-xs font-normal text-fg-muted">{unit}</span></span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-fg-subtle">{t("history")}</h2>
        {history.length === 0 ? <p className="rounded-2xl border border-dashed border-border-strong p-5 text-center text-sm text-fg-muted">{t("noHistory")}</p> : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span><span className="font-medium">{t(`kinds.${h.kind}`)}</span><span className="block text-xs text-fg-muted">{format.dateTime(new Date(h.created_at), { dateStyle: "medium", timeStyle: "short" })}</span></span>
                <span className={cn("tabular font-semibold", h.amount > 0 ? "text-success-700" : "text-fg-muted")}>{h.amount > 0 ? `+${h.amount}` : h.amount}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="mt-8 space-y-2 text-center text-xs text-fg-muted">
        <p className="font-medium text-fg">{merchant.name}</p>
        {(merchant.city || merchant.phone) && <p className="flex items-center justify-center gap-3">{merchant.city && <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{merchant.city}</span>}{merchant.phone && <a href={`tel:${merchant.phone}`} className="inline-flex items-center gap-1" dir="ltr"><Phone className="size-3" />{merchant.phone}</a>}</p>}
        {program.terms && <p className="mx-auto max-w-xs">{program.terms}</p>}
        <p className="pt-2">{t("saveTip")}</p>
        <div className="flex justify-center pt-4 opacity-50"><Logo size={20} /></div>
      </footer>
    </main>
  );
}
