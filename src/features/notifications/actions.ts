"use server";
import { revalidatePath } from "next/cache";
import { requireMerchant } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function markAllRead() {
  const { merchantId } = await requireMerchant();
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("merchant_id", merchantId).is("read_at", null);
  revalidatePath("/dashboard", "layout");
}
