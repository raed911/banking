import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SUB_TONE } from "@/lib/admin-format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const FILTERS = ["active", "trialing", "expired", "suspended"] as const;

export default async function AdminMerchants({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const t = await getTranslations("admin");
  const format = await getFormatter();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().replace(/[%_\\]/g, "").slice(0, 80) || null;
  const status = (FILTERS as readonly string[]).includes(sp.status ?? "") ? sp.status! : null;
  const supabase = await createClient();
  const { data: rows } = await supabase.rpc("admin_merchants", { p_search: q ?? undefined, p_status: status ?? undefined, p_limit: 100 });
  const qs = (s: string | null) => `?${new URLSearchParams({ ...(q ? { q } : {}), ...(s ? { status: s } : {}) })}`;
  return (
    <div className="space-y-6">
      <PageHeader title={t("merchants.title")} />
      <div className="flex flex-col gap-3 sm:flex-row">
        <form className="flex-1" role="search">{status && <input type="hidden" name="status" value={status} />}<Input name="q" defaultValue={q ?? ""} placeholder={t("merchants.search")} leading={<Search />} className="h-10" /></form>
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-surface-sunken p-1">
          {[null, ...FILTERS].map((f) => <Link key={f ?? "all"} href={qs(f)} className={cn("shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium", status === f ? "bg-surface shadow-sm" : "text-fg-muted")}>{f ? t(`merchants.filter.${f}`) : t("merchants.all")}</Link>)}
        </div>
      </div>
      <Card className="overflow-hidden">
        {!rows?.length ? <p className="p-8 text-center text-sm text-fg-muted">{t("merchants.empty")}</p> : (
          <ul className="divide-y divide-border">
            {rows.map((m) => {
              const until = m.sub_status === "trialing" ? m.trial_ends_at : m.current_period_end;
              return (
                <li key={m.id}>
                  <Link href={`/admin/merchants/${m.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3.5 transition hover:bg-surface-muted md:grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_140px_120px_80px]">
                    <span className="flex min-w-0 items-center gap-3"><Avatar name={m.name} size={36} /><span className="min-w-0"><span className="block truncate font-medium">{m.name}</span><span className="block truncate text-xs text-fg-muted">{m.city ?? m.slug}</span></span></span>
                    <span className="hidden truncate text-sm text-fg-muted md:block">{m.owner_email}</span>
                    <span className="flex flex-wrap gap-1">
                      {m.status === "suspended" ? <Badge tone="danger" dot>{t("merchant.merchantStatus.suspended")}</Badge> : <Badge tone={m.sub_status ? SUB_TONE[m.sub_status] : "neutral"} dot>{t(`sub.${m.sub_status ?? "none"}`)}</Badge>}
                    </span>
                    <span className="hidden text-sm text-fg-muted md:block">{until ? format.dateTime(new Date(until), { dateStyle: "medium" }) : t("merchants.none")}</span>
                    <span className="tabular hidden text-end text-sm md:block">{m.customers}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
