import { getFormatter, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { requireMerchant } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { TeamManager } from "./team-manager";

export default async function EmployeesPage() {
  const { merchantId, user } = await requireMerchant("employees.manage");
  const t = await getTranslations("team");
  const format = await getFormatter();
  const supabase = await createClient();
  const [{ data: team }, { data: roles }, { data: invites }] = await Promise.all([
    supabase.rpc("merchant_team", { p_merchant_id: merchantId }),
    supabase.from("roles").select("id, key, name").eq("merchant_id", merchantId).order("created_at"),
    supabase.from("invitations").select("id, email, expires_at, role_id").eq("merchant_id", merchantId).is("accepted_at", null).is("revoked_at", null).gt("expires_at", new Date().toISOString()),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <TeamManager me={user.id} team={team ?? []} roles={roles ?? []}
        invites={(invites ?? []).map((i) => ({ id: i.id, email: i.email, role: roles?.find((r) => r.id === i.role_id)?.name ?? "", expires: format.dateTime(new Date(i.expires_at), { dateStyle: "medium" }) }))} />
    </div>
  );
}
