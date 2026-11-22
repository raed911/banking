import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { requireMerchant } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { ProgramForm } from "../program-form";
import { STATUS_TONE } from "@/features/programs/constants";
import { CardDesigner } from "./card-designer";
import { RewardsManager } from "./rewards-manager";
import { EnrollmentManager } from "./enrollment-manager";
import { ProgramStatusActions } from "./status-actions";

const TABS = ["design", "rewards", "enroll", "settings"] as const;

export default async function ProgramPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const tab = (TABS as readonly string[]).includes((await searchParams).tab ?? "") ? ((await searchParams).tab as (typeof TABS)[number]) : "design";
  const { merchantId, membership, permissions } = await requireMerchant();
  const t = await getTranslations("programs");
  const supabase = await createClient();
  const { data: program } = await supabase.from("loyalty_programs").select("*").eq("id", id).eq("merchant_id", merchantId).maybeSingle();
  if (!program) notFound();
  const manage = can(permissions, "programs.manage");

  const [{ data: design }, { data: rewards }, { data: links }] = await Promise.all([
    supabase.from("card_designs").select("*").eq("program_id", id).maybeSingle(),
    supabase.from("rewards").select("*").eq("program_id", id).order("cost"),
    supabase.from("enrollment_links").select("*").eq("program_id", id).order("created_at"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/programs" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg"><ArrowLeft className="size-4 rtl:rotate-180" />{t("title")}</Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="truncate text-2xl font-semibold tracking-[-0.03em] sm:text-[28px]">{program.name}</h1>
            <Badge tone={STATUS_TONE[program.status]} dot>{t(`status.${program.status}`)}</Badge>
          </div>
          {manage && <ProgramStatusActions programId={id} status={program.status} />}
        </div>
        <p className="mt-1 text-sm text-fg-muted">{t(`types.${program.type}`)}{program.description ? ` · ${program.description}` : ""}</p>
      </div>

      <nav className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0" aria-label="Sections">
        {TABS.map((k) => (
          <Link key={k} href={`?tab=${k}`} scroll={false} aria-current={tab === k ? "page" : undefined}
            className={cn("relative shrink-0 px-3 pb-3 pt-1 text-sm font-medium transition-colors", tab === k ? "text-fg" : "text-fg-muted hover:text-fg")}>
            {t(`tabs.${k}`)}
            {tab === k && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-ink-900" />}
          </Link>
        ))}
      </nav>

      <div className="animate-fade-in" key={tab}>
        {tab === "design" && (
          <CardDesigner programId={id} merchantId={merchantId} merchantName={membership.merchant.name} canEdit={manage}
            program={{ name: program.name, type: program.type, stamps_required: program.stamps_required, reward_title: program.reward_title }}
            design={design ?? null} />
        )}
        {tab === "rewards" && <RewardsManager programId={id} type={program.type} rewards={rewards ?? []} canEdit={can(permissions, "rewards.manage")} />}
        {tab === "enroll" && <EnrollmentManager programId={id} appUrl={publicEnv.NEXT_PUBLIC_APP_URL} links={links ?? []} canEdit={manage} merchantName={membership.merchant.name} />}
        {tab === "settings" && (manage ? <ProgramForm merchantName={membership.merchant.name} program={program} /> : null)}
      </div>
    </div>
  );
}
