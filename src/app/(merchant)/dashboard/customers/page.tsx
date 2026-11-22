import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight, Search, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/states";
import { requireMerchant } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { AddCustomer } from "./add-customer";

const PAGE_SIZE = 25;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; new?: string }> }) {
  const { merchantId, permissions } = await requireMerchant("customers.view");
  const t = await getTranslations("customers");
  const format = await getFormatter();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();

  let query = supabase.from("customers")
    .select("id, first_name, last_name, phone, email, total_visits, last_visit_at, created_at, loyalty_cards(count)", { count: "exact" })
    .eq("merchant_id", merchantId).is("deleted_at", null)
    .order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q) {
    const safe = q.replace(/[%_,()*\\]/g, " ").trim();
    const digits = q.replace(/\D/g, "");
    query = query.or([`first_name.ilike.%${safe}%`, `last_name.ilike.%${safe}%`, `email.ilike.%${safe}%`, ...(digits.length >= 3 ? [`phone.ilike.%${digits}%`] : [])].join(","));
  }
  const [{ data: customers, count }, { data: programs }] = await Promise.all([
    query,
    supabase.from("loyalty_programs").select("id, name").eq("merchant_id", merchantId).eq("status", "active").order("created_at"),
  ]);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const manage = can(permissions, "customers.manage");
  const href = (p: number) => `?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} actions={manage && <AddCustomer programs={programs ?? []} defaultOpen={sp.new === "1"} />} />
      <form className="flex gap-2" role="search">
        <Input name="q" defaultValue={q} placeholder={t("search")} leading={<Search />} className="h-11" />
        <Button type="submit" variant="secondary" className="h-11">{t("search").split(" ")[0]}</Button>
      </form>

      {!customers?.length ? (
        <EmptyState icon={<Users />} title={q ? t("noResults") : t("emptyTitle")} description={q ? undefined : t("emptyDesc")} />
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,2fr)_80px_90px_minmax(0,1.2fr)] gap-4 border-b border-border bg-surface-muted px-5 py-3 text-xs font-medium uppercase tracking-[0.08em] text-fg-subtle md:grid">
            <span>{t("cols.customer")}</span><span>{t("cols.contact")}</span><span className="text-end">{t("cols.cards")}</span><span className="text-end">{t("cols.visits")}</span><span className="text-end">{t("cols.lastVisit")}</span>
          </div>
          <ul className="divide-y divide-border">
            {customers.map((c) => {
              const name = `${c.first_name} ${c.last_name ?? ""}`.trim();
              const cards = (c.loyalty_cards as unknown as { count: number }[])[0]?.count ?? 0;
              return (
                <li key={c.id}>
                  <Link href={`/dashboard/customers/${c.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3.5 transition hover:bg-surface-muted md:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_80px_90px_minmax(0,1.2fr)]">
                    <span className="flex min-w-0 items-center gap-3"><Avatar name={name} size={36} /><span className="min-w-0"><span className="block truncate font-medium">{name}</span><span className="block truncate text-xs text-fg-muted md:hidden" dir="ltr">{c.phone ?? c.email}</span></span></span>
                    <span className="hidden min-w-0 text-sm text-fg-muted md:block"><span className="block truncate" dir="ltr">{c.phone}</span><span className="block truncate text-xs">{c.email}</span></span>
                    <span className="tabular hidden text-end text-sm md:block">{cards}</span>
                    <span className="tabular text-end text-sm font-medium">{c.total_visits}<span className="text-fg-subtle md:hidden"> ✓</span></span>
                    <span className="hidden text-end text-sm text-fg-muted md:block">{c.last_visit_at ? format.relativeTime(new Date(c.last_visit_at)) : t("never")}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-sm text-fg-muted">
            <span>{t("total", { count: count ?? 0 })} · {t("page", { page, pages })}</span>
            <div className="flex gap-1">
              <Button asChild variant="ghost" size="icon" aria-disabled={page <= 1} className={page <= 1 ? "pointer-events-none opacity-40" : ""}><Link href={href(page - 1)} aria-label={t("prev")}><ChevronLeft className="rtl:rotate-180" /></Link></Button>
              <Button asChild variant="ghost" size="icon" aria-disabled={page >= pages} className={page >= pages ? "pointer-events-none opacity-40" : ""}><Link href={href(page + 1)} aria-label={t("next")}><ChevronRight className="rtl:rotate-180" /></Link></Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
