import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CreditCard, Plus } from "lucide-react";
import { WalletCard } from "@/components/loyalty/wallet-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/states";
import { requireMerchant } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { publicAssetUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { STATUS_TONE } from "@/features/programs/constants";


export default async function ProgramsPage() {
  const { merchantId, membership, permissions } = await requireMerchant();
  const t = await getTranslations("programs");
  const supabase = await createClient();
  const { data: programs } = await supabase
    .from("loyalty_programs")
    .select("id, name, type, status, stamps_required, reward_title, card_designs(*), loyalty_cards(count)")
    .eq("merchant_id", merchantId)
    .neq("status", "archived")
    .order("created_at");
  const manage = can(permissions, "programs.manage");

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} description={t("subtitle")} actions={manage && <Button asChild><Link href="/dashboard/programs/new"><Plus />{t("new")}</Link></Button>} />
      {!programs?.length ? (
        <EmptyState icon={<CreditCard />} title={t("emptyTitle")} description={t("emptyDesc")} action={manage && <Button asChild variant="accent" size="lg"><Link href="/dashboard/programs/new"><Plus />{t("new")}</Link></Button>} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {programs.map((p, i) => {
            const d = Array.isArray(p.card_designs) ? p.card_designs[0] : p.card_designs;
            const count = (p.loyalty_cards as unknown as { count: number }[])[0]?.count ?? 0;
            return (
              <Link key={p.id} href={`/dashboard/programs/${p.id}`} className="group animate-fade-up rounded-3xl border border-border bg-surface p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="bg-grid-ink flex justify-center rounded-2xl bg-surface-muted px-4 py-6">
                  <WalletCard compact className="max-w-[280px] transition-transform duration-500 group-hover:rotate-[-1.5deg] group-hover:scale-[1.02]"
                    merchantName={d?.logo_text || membership.merchant.name} programName={p.name} type={p.type} stampsRequired={p.stamps_required}
                    balance={p.type === "points" ? 120 : Math.ceil((p.stamps_required ?? 10) * 0.6)} backgroundColor={d?.background_color} foregroundColor={d?.foreground_color}
                    labelColor={d?.label_color} accentColor={d?.accent_color} stampIcon={d?.stamp_icon} logoUrl={publicAssetUrl(d?.logo_path)} stripUrl={publicAssetUrl(d?.strip_path)} />
                </div>
                <div className="mt-4 flex items-start justify-between gap-3 px-1">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold tracking-[-0.01em]">{p.name}</h3>
                    <p className="mt-0.5 text-sm text-fg-muted">{t(`types.${p.type}`)} · {t("cards", { count })}</p>
                  </div>
                  <Badge tone={STATUS_TONE[p.status]} dot>{t(`status.${p.status}`)}</Badge>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
