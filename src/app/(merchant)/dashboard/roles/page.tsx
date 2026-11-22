import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { requireMerchant } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { RolesEditor } from "./roles-editor";

export default async function RolesPage() {
  const { merchantId } = await requireMerchant("roles.manage");
  const t = await getTranslations("roles");
  const supabase = await createClient();
  const [{ data: roles }, { data: members }] = await Promise.all([
    supabase.from("roles").select("id, key, name, description, permissions, is_system").eq("merchant_id", merchantId).order("created_at"),
    supabase.from("merchant_members").select("role_id").eq("merchant_id", merchantId),
  ]);
  const usage = Object.fromEntries((roles ?? []).map((r) => [r.id, (members ?? []).filter((m) => m.role_id === r.id).length]));
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <RolesEditor roles={roles ?? []} usage={usage} />
    </div>
  );
}
