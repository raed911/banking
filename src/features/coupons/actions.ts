"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMerchant } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/action";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,24}$/),
  kind: z.enum(["percent", "fixed", "free_item", "custom"]),
  value: z.union([z.literal(""), z.coerce.number().positive().max(100000)]).optional(),
  status: z.enum(["draft", "active", "paused", "archived"]),
  starts_at: z.string().optional().or(z.literal("")),
  ends_at: z.string().optional().or(z.literal("")),
  max_redemptions: z.union([z.literal(""), z.coerce.number().int().positive()]).optional(),
  per_customer_limit: z.coerce.number().int().min(1).max(1000).default(1),
  terms: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function saveCoupon(couponId: string | null, _: ActionState, form: FormData): Promise<ActionState> {
  const { merchantId } = await requireMerchant("coupons.manage");
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "validation" };
  const v = parsed.data;
  if ((v.kind === "percent" || v.kind === "fixed") && !v.value) return { error: "validation" };
  if (v.kind === "percent" && Number(v.value) > 100) return { error: "validation" };
  const row = {
    name: v.name, kind: v.kind, value: v.value === "" || v.value === undefined ? null : v.value, status: v.status,
    starts_at: v.starts_at ? new Date(v.starts_at).toISOString() : null, ends_at: v.ends_at ? new Date(v.ends_at).toISOString() : null,
    max_redemptions: v.max_redemptions === "" || v.max_redemptions === undefined ? null : v.max_redemptions, per_customer_limit: v.per_customer_limit, terms: v.terms || null,
  };
  const supabase = await createClient();
  const { error } = couponId
    ? await supabase.from("coupons").update(row).eq("id", z.uuid().parse(couponId))
    : await supabase.from("coupons").insert({ ...row, code: v.code, merchant_id: merchantId });
  if (error) return { error: error.code === "23505" ? "duplicate" : error.code === "23514" ? "validation" : "generic" };
  revalidatePath("/dashboard/coupons");
  return { ok: true };
}

export async function deleteCoupon(couponId: string) {
  await requireMerchant("coupons.manage");
  const supabase = await createClient();
  const { error } = await supabase.from("coupons").delete().eq("id", z.uuid().parse(couponId));
  if (error) await supabase.from("coupons").update({ status: "archived" }).eq("id", couponId);
  revalidatePath("/dashboard/coupons");
}

export async function reviewFraudSignal(signalId: string) {
  const { user } = await requireMerchant("cards.adjust");
  const supabase = await createClient();
  await supabase.from("fraud_signals").update({ reviewed_at: new Date().toISOString(), reviewed_by: user.id }).eq("id", z.uuid().parse(signalId));
  revalidatePath("/dashboard/transactions");
}
