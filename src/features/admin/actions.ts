"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionState } from "@/lib/action";

const uuid = z.uuid();

export async function recordPayment(merchantId: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requirePlatformAdmin();
  const parsed = z.object({
    price_id: z.uuid(), quantity: z.coerce.number().int().min(1).max(1000), amount: z.coerce.number().positive().max(10_000_000),
    method: z.enum(["cash", "bank_transfer", "card", "cheque", "other"]), reference: z.string().trim().max(80).optional(), notes: z.string().trim().max(500).optional(),
    invoice_id: z.uuid().optional().or(z.literal("")),
  }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "validation" };
  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_record_payment", {
    p_merchant_id: uuid.parse(merchantId), p_price_id: v.price_id, p_quantity: v.quantity, p_amount_millimes: Math.round(v.amount * 1000),
    p_method: v.method, p_reference: v.reference || undefined, p_notes: v.notes || undefined, p_invoice_id: v.invoice_id || undefined,
  });
  if (error) return { error: error.message.includes("invoice_already_paid") ? "invoice_already_paid" : error.code === "42501" ? "forbidden" : "generic" };
  revalidatePath(`/admin/merchants/${merchantId}`);
  revalidatePath("/admin", "layout");
  return { ok: true, data: data as Record<string, unknown> };
}

export async function extendTrial(merchantId: string, days: number) {
  await requirePlatformAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_extend_trial", { p_merchant_id: uuid.parse(merchantId), p_days: z.number().int().min(1).max(365).parse(days) });
  revalidatePath(`/admin/merchants/${merchantId}`);
  return { ok: !error };
}

export async function setMerchantStatus(merchantId: string, status: "active" | "suspended", reason?: string) {
  await requirePlatformAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_merchant_status", { p_merchant_id: uuid.parse(merchantId), p_status: status, p_reason: reason?.slice(0, 300) || undefined });
  revalidatePath(`/admin/merchants/${merchantId}`);
  revalidatePath("/admin/merchants");
  return { ok: !error };
}

export async function updatePrices(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requirePlatformAdmin();
  const db = createAdminClient();
  const updates: { id: string; amount_millimes: number; badge: string | null }[] = [];
  for (const [k, v] of form.entries()) {
    const m = /^price:([0-9a-f-]{36})$/.exec(k);
    if (!m) continue;
    const amount = Number(String(v).replace(",", "."));
    if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000) return { error: "validation" };
    updates.push({ id: m[1]!, amount_millimes: Math.round(amount * 1000), badge: String(form.get(`badge:${m[1]}`) ?? "").trim().slice(0, 40) || null });
  }
  for (const u of updates) await db.from("plan_prices").update({ amount_millimes: u.amount_millimes, badge: u.badge }).eq("id", u.id);
  const planId = form.get("plan_id");
  const trial = Number(form.get("trial_days"));
  if (typeof planId === "string" && uuid.safeParse(planId).success && Number.isInteger(trial) && trial >= 0 && trial <= 90) {
    await db.from("plans").update({ trial_days: trial }).eq("id", planId);
  }
  await db.from("audit_logs").insert({ actor_id: user.id, actor_type: "admin", action: "plans.prices_updated", entity_type: "plan", entity_id: String(planId ?? ""), details: { updates } });
  revalidatePath("/admin/plans");
  return { ok: true };
}
