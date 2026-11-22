import { getTranslations } from "next-intl/server";
import { requireMerchant } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Scanner } from "./scanner";

export async function generateMetadata() {
  return { title: (await getTranslations("scan"))("title") };
}

export default async function ScanPage() {
  const { merchantId, membership } = await requireMerchant("cards.earn");
  const supabase = await createClient();
  const { data: locations } = await supabase.from("locations").select("id, name").eq("merchant_id", merchantId).eq("is_active", true).order("created_at");
  return <Scanner merchantName={membership.merchant.name} locations={locations ?? []} permissions={membership.role.permissions} />;
}
