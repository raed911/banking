"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMerchant } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/action";

export async function saveAutomation(kind: "winback" | "birthday", _: ActionState, form: FormData): Promise<ActionState> {
  const { merchantId } = await requireMerchant("campaigns.manage");
  const parsed = z.object({
    channel: z.enum(["card", "wallet", "email"]), message: z.string().trim().min(3).max(300),
    inactive_days: z.coerce.number().int().min(7).max(365).default(30), cooldown_days: z.coerce.number().int().min(7).max(365).default(30),
    coupon_id: z.uuid().optional().or(z.literal("")),
  }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "error" };
  const row = { ...parsed.data, coupon_id: parsed.data.coupon_id || null, enabled: form.get("enabled") === "on", cooldown_days: kind === "birthday" ? 300 : parsed.data.cooldown_days };
  const supabase = await createClient();
  const { data: existing } = await supabase.from("automations").select("id").eq("merchant_id", merchantId).eq("kind", z.enum(["winback", "birthday"]).parse(kind)).maybeSingle();
  const { error } = existing ? await supabase.from("automations").update(row).eq("id", existing.id) : await supabase.from("automations").insert({ ...row, merchant_id: merchantId, kind });
  if (error) return { error: "error" };
  revalidatePath("/dashboard/campaigns");
  return { ok: true };
}
