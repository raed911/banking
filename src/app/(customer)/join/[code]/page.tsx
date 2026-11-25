import { getTranslations } from "next-intl/server";
import { Gift, Link2Off } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { WalletCard } from "@/components/loyalty/wallet-card";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicAssetUrl } from "@/lib/storage";
import { JoinForm } from "./join-form";

async function load(code: string) {
  if (!/^[a-z0-9]{6,16}$/.test(code)) return null;
  const db = createAdminClient();
  const { data: link } = await db.from("enrollment_links")
    .select("code, is_active, expires_at, require_phone, require_email, collect_birthday, program:loyalty_programs(id, name, type, status, stamps_required, reward_title, welcome_bonus, description, referral_enabled, referral_reward), merchant:merchants(name, status, logo_path)")
    .eq("code", code).maybeSingle();
  if (!link || !link.is_active || !link.program || !link.merchant || link.program.status !== "active" || link.merchant.status !== "active") return null;
  if (link.expires_at && new Date(link.expires_at) < new Date()) return null;
  const { data: design } = await db.from("card_designs").select("*").eq("program_id", link.program.id).maybeSingle();
  return { link, design };
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const data = await load((await params).code);
  return { title: data ? `${data.link.merchant!.name} · ${data.link.program!.name}` : "VAYRO" };
}

/** The friend who shared the link (first name only), when the code belongs to an active card of this program. */
async function referrer(programId: string, ref: string | undefined) {
  if (!ref || !/^[A-Za-z2-9]{8}$/.test(ref)) return null;
  const { data } = await createAdminClient().from("loyalty_cards").select("customer:customers(first_name)")
    .eq("referral_code", ref.toUpperCase()).eq("program_id", programId).eq("status", "active").maybeSingle();
  return data ? { code: ref.toUpperCase(), name: data.customer?.first_name ?? "" } : null;
}

export default async function JoinPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ ref?: string }> }) {
  const { code } = await params;
  const { ref } = await searchParams;
  const t = await getTranslations("public.join");
  const data = await load(code);
  if (!data) {
    return (
      <main className="grid min-h-dvh place-items-center px-4 text-center">
        <div><div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-ink-900 text-lime-300"><Link2Off className="size-6" /></div>
          <h1 className="text-xl font-semibold">{t("unavailableTitle")}</h1><p className="mt-2 text-fg-muted">{t("errors.link_invalid")}</p></div>
      </main>
    );
  }
  const { link, design } = data;
  const program = link.program!;
  const merchant = link.merchant!;
  const bg = design?.background_color ?? "#101828";
  const friend = program.referral_enabled ? await referrer(program.id, ref) : null;
  return (
    <main className="relative mx-auto max-w-md px-4 pb-10">
      <div className="absolute inset-x-0 top-0 -z-0 h-72 rounded-b-[40px]" style={{ background: bg }} />
      <div className="relative pt-8 text-center" style={{ color: design?.foreground_color ?? "#fff" }}>
        <p className="text-sm font-medium opacity-80">{merchant.name}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em]">{t("title")}</h1>
      </div>
      <div className="relative mt-6 flex justify-center">
        <WalletCard compact hideBarcode className="max-w-[300px] animate-float" merchantName={design?.logo_text || merchant.name} programName={program.name} type={program.type}
          stampsRequired={program.stamps_required} balance={program.welcome_bonus} rewardTitle={program.reward_title}
          backgroundColor={design?.background_color} foregroundColor={design?.foreground_color} labelColor={design?.label_color} accentColor={design?.accent_color}
          stampIcon={design?.stamp_icon} logoUrl={publicAssetUrl(design?.logo_path ?? merchant.logo_path)} stripUrl={publicAssetUrl(design?.strip_path)} />
      </div>
      <div className="relative mt-6 rounded-3xl border border-border bg-surface p-5 shadow-sm">
        {friend && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl bg-lime-100 p-3.5 text-sm text-lime-900">
            <Gift className="mt-0.5 size-5 shrink-0" />
            <p><span className="font-semibold">{t("invitedBy", { name: friend.name })}</span> {t("invitedBonus", { count: program.referral_reward })}</p>
          </div>
        )}
        <p className="text-sm text-fg-muted">{t("subtitle")}</p>
        {program.welcome_bonus > 0 && <p className="mt-2 inline-flex rounded-full bg-lime-100 px-2.5 py-1 text-xs font-semibold text-lime-800">{t("welcome", { count: program.welcome_bonus })}</p>}
        <JoinForm code={code} merchant={merchant.name} requirePhone={link.require_phone} requireEmail={link.require_email} collectBirthday={link.collect_birthday} referralCode={friend?.code ?? null} />
      </div>
      <div className="mt-8 flex justify-center opacity-60"><Logo size={22} /></div>
    </main>
  );
}
