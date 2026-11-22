"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMerchant } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { parseCardQr } from "@/lib/loyalty/qr-token";
import { normalizePhone } from "@/lib/phone";

export type ScannedCard = {
  id: string; serial: string; balance: number; status: string;
  customer: { id: string; first_name: string; last_name: string | null; phone: string | null };
  program: { id: string; name: string; type: "stamps" | "points" | "visits"; stamps_required: number | null; points_per_unit: number | null; status: string };
  rewards: { id: string; name: string; cost: number; stock: number | null }[];
};
export type OpResult = { ok: true; data: Record<string, unknown> } | { ok: false; error: string; meta?: Record<string, unknown> };

const CARD_SELECT = "id, serial, balance, status, customer:customers!inner(id, first_name, last_name, phone), program:loyalty_programs!inner(id, name, type, stamps_required, points_per_unit, status)";

async function withRewards(cards: unknown[]): Promise<ScannedCard[]> {
  const list = cards as Omit<ScannedCard, "rewards">[];
  if (!list.length) return [];
  const supabase = await createClient();
  const { data: rewards } = await supabase.from("rewards").select("id, name, cost, stock, program_id").in("program_id", [...new Set(list.map((c) => c.program.id))]).eq("is_active", true).order("cost");
  return list.map((c) => ({ ...c, rewards: (rewards ?? []).filter((r) => r.program_id === c.program.id).map((r) => ({ id: r.id, name: r.name, cost: r.cost, stock: r.stock })) }));
}

/** Resolves a scanned QR payload, a card serial or a phone number to the merchant's card(s). */
export async function resolveCard(input: string): Promise<{ ok: true; cards: ScannedCard[] } | { ok: false; error: string }> {
  const { merchantId } = await requireMerchant("cards.earn");
  const raw = z.string().trim().min(3).max(200).safeParse(input);
  if (!raw.success) return { ok: false, error: "not_found" };
  const supabase = await createClient();
  const base = () => supabase.from("loyalty_cards").select(CARD_SELECT).eq("merchant_id", merchantId).neq("status", "archived");

  const value = raw.data;
  if (value.startsWith("VY")) {
    const parsed = parseCardQr(value);
    if (parsed.kind === "invalid") return { ok: false, error: parsed.reason === "format" ? "invalid_qr" : parsed.reason };
    const { data } = parsed.kind === "dynamic" ? await base().eq("id", parsed.cardId) : await base().eq("serial", parsed.serial);
    return data?.length ? { ok: true, cards: await withRewards(data) } : { ok: false, error: "not_found" };
  }
  if (/^[A-Za-z2-9]{10}$/.test(value)) {
    const { data } = await base().eq("serial", value.toUpperCase());
    if (data?.length) return { ok: true, cards: await withRewards(data) };
  }
  const phone = normalizePhone(value);
  if (phone) {
    const { data } = await base().eq("customer.phone", phone);
    if (data?.length) return { ok: true, cards: await withRewards(data) };
  }
  if (value.startsWith("http")) return { ok: false, error: "invalid_qr" };
  return { ok: false, error: "not_found" };
}

const key = z.string().min(8).max(100);
const uuid = z.uuid();

function done(r: unknown): OpResult {
  const res = r as { ok: boolean; error?: string } & Record<string, unknown>;
  if (!res?.ok) return { ok: false, error: res?.error ?? "generic", meta: res };
  revalidatePath("/dashboard", "layout");
  return { ok: true, data: res };
}

export async function earn(cardId: string, idempotencyKey: string, opts: { amount?: number; purchaseTnd?: number; locationId?: string | null }): Promise<OpResult> {
  await requireMerchant("cards.earn");
  const purchase = opts.purchaseTnd != null ? Math.round(z.number().positive().max(1_000_000).parse(opts.purchaseTnd) * 1000) : undefined;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("apply_loyalty_transaction", {
    p_card_id: uuid.parse(cardId), p_kind: "earn", p_amount: z.number().int().min(1).max(100000).parse(opts.amount ?? 1),
    p_idempotency_key: key.parse(idempotencyKey), p_location_id: opts.locationId ? uuid.parse(opts.locationId) : undefined,
    p_source: "scanner", p_purchase_millimes: purchase,
  });
  return error ? { ok: false, error: "generic" } : done(data);
}

export async function adjust(cardId: string, idempotencyKey: string, amount: number, note: string): Promise<OpResult> {
  await requireMerchant("cards.adjust");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("apply_loyalty_transaction", {
    p_card_id: uuid.parse(cardId), p_kind: "adjust", p_amount: z.number().int().min(-100000).max(100000).refine((n) => n !== 0).parse(amount),
    p_idempotency_key: key.parse(idempotencyKey), p_source: "dashboard", p_note: z.string().trim().min(2).max(200).parse(note),
  });
  return error ? { ok: false, error: "generic" } : done(data);
}

export async function redeem(cardId: string, rewardId: string, idempotencyKey: string, locationId?: string | null): Promise<OpResult> {
  await requireMerchant("rewards.redeem");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("redeem_reward", {
    p_card_id: uuid.parse(cardId), p_reward_id: uuid.parse(rewardId), p_idempotency_key: key.parse(idempotencyKey),
    p_location_id: locationId ? uuid.parse(locationId) : undefined, p_source: "scanner",
  });
  return error ? { ok: false, error: "generic" } : done(data);
}

export async function applyCoupon(cardId: string | null, code: string, idempotencyKey: string, locationId?: string | null): Promise<OpResult> {
  const { merchantId } = await requireMerchant("coupons.redeem");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("redeem_coupon", {
    p_merchant_id: merchantId, p_code: z.string().trim().min(3).max(24).parse(code), p_card_id: cardId ? uuid.parse(cardId) : (null as unknown as string),
    p_idempotency_key: key.parse(idempotencyKey), p_location_id: locationId ? uuid.parse(locationId) : undefined,
  });
  return error ? { ok: false, error: "generic" } : done(data);
}

export async function reverseTransaction(transactionId: string, reason: string): Promise<OpResult> {
  await requireMerchant("cards.adjust");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reverse_transaction", { p_transaction_id: uuid.parse(transactionId), p_reason: z.string().trim().min(2).max(200).parse(reason) });
  return error ? { ok: false, error: "generic" } : done(data);
}
