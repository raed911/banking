"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMerchant } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/action";

export async function requestInvoice(_: ActionState, form: FormData): Promise<ActionState> {
  const { merchantId } = await requireMerchant("billing.manage");
  const parsed = z.object({ price_id: z.uuid(), quantity: z.coerce.number().int().min(1).max(100) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "error" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_subscription_invoice", { p_merchant_id: merchantId, p_price_id: parsed.data.price_id, p_quantity: parsed.data.quantity });
  if (error) return { error: "error" };
  revalidatePath("/dashboard/billing");
  return { ok: true };
}
