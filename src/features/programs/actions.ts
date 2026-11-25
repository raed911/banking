"use server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { refreshWalletMerchant } from "@/lib/wallet/sync";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireMerchant } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { fieldErrorsFrom, type ActionState } from "@/lib/action";
import { designSchema, linkSchema, programSchema, rewardSchema } from "./schemas";

const id = z.uuid();
const bool = (f: FormData, k: string) => f.get(k) === "on" || f.get(k) === "true";

export async function createProgram(_: ActionState, form: FormData): Promise<ActionState> {
  const { merchantId, membership } = await requireMerchant("programs.manage");
  const parsed = programSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "validation", fieldErrors: fieldErrorsFrom(parsed.error) };
  const v = parsed.data;
  const supabase = await createClient();
  const { data: program, error } = await supabase.from("loyalty_programs").insert({
    merchant_id: merchantId, name: v.name, description: v.description || null, type: v.type, status: "active",
    stamps_required: v.type === "points" ? null : v.stamps_required, points_per_unit: v.type === "points" ? v.points_per_unit : null,
    reward_title: v.reward_title || null, welcome_bonus: v.welcome_bonus,
    cooldown_minutes: v.cooldown_minutes, max_earn_per_day: v.type === "points" ? Math.max(v.max_earn_per_day, 100000) : v.max_earn_per_day,
    max_earn_per_transaction: v.type === "points" ? Math.max(v.max_earn_per_transaction, 100000) : v.max_earn_per_transaction,
    terms: v.terms || null, referral_enabled: v.referral_enabled, referral_reward: v.referral_reward,
  }).select("id").single();
  if (error || !program) return { error: error?.code === "42501" ? "forbidden" : "generic" };

  const accent = membership.merchant.brand_color === "#101828" ? "#C6F36B" : membership.merchant.brand_color;
  await Promise.all([
    supabase.from("card_designs").insert({ program_id: program.id, merchant_id: merchantId, background_color: "#101828", foreground_color: "#FFFFFF", label_color: accent, accent_color: accent, logo_text: membership.merchant.name }),
    v.type !== "points" && v.reward_title
      ? supabase.from("rewards").insert({ merchant_id: merchantId, program_id: program.id, name: v.reward_title, cost: v.stamps_required! })
      : Promise.resolve(),
    supabase.from("enrollment_links").insert({ merchant_id: merchantId, program_id: program.id, name: "Comptoir", require_phone: true }),
  ]);
  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/programs/${program.id}?created=1`);
}

export async function updateProgram(programId: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireMerchant("programs.manage");
  const parsed = programSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "validation", fieldErrors: fieldErrorsFrom(parsed.error) };
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("loyalty_programs").update({
    name: v.name, description: v.description || null,
    stamps_required: v.type === "points" ? null : v.stamps_required, points_per_unit: v.type === "points" ? v.points_per_unit : null,
    reward_title: v.reward_title || null, welcome_bonus: v.welcome_bonus, cooldown_minutes: v.cooldown_minutes,
    max_earn_per_day: v.max_earn_per_day, max_earn_per_transaction: v.max_earn_per_transaction, terms: v.terms || null,
    referral_enabled: v.referral_enabled, referral_reward: v.referral_reward,
  }).eq("id", id.parse(programId));
  if (error) return { error: "generic" };
  revalidatePath(`/dashboard/programs/${programId}`);
  return { ok: true };
}

export async function setProgramStatus(programId: string, status: "active" | "paused" | "archived") {
  await requireMerchant("programs.manage");
  const supabase = await createClient();
  await supabase.from("loyalty_programs").update({ status }).eq("id", id.parse(programId));
  revalidatePath("/dashboard/programs", "layout");
}

export async function saveDesign(programId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const { merchantId } = await requireMerchant("programs.manage");
  const raw = Object.fromEntries(form);
  const parsed = designSchema.safeParse({ ...raw, logo_path: raw.logo_path || null, strip_path: raw.strip_path || null });
  if (!parsed.success) return { error: "validation", fieldErrors: fieldErrorsFrom(parsed.error) };
  // asset paths must live in this merchant's folder
  for (const p of [parsed.data.logo_path, parsed.data.strip_path]) if (p && !p.startsWith(`${merchantId}/`)) return { error: "forbidden" };
  const supabase = await createClient();
  const { error } = await supabase.from("card_designs").upsert({ program_id: id.parse(programId), merchant_id: merchantId, ...parsed.data, logo_text: parsed.data.logo_text || null });
  if (error) return { error: "generic" };
  after(() => refreshWalletMerchant(merchantId).catch(() => undefined)); // re-publish card design to issued passes
  revalidatePath(`/dashboard/programs/${programId}`);
  revalidatePath("/dashboard/programs");
  return { ok: true };
}

export async function saveReward(programId: string, rewardId: string | null, _: ActionState, form: FormData): Promise<ActionState> {
  const { merchantId } = await requireMerchant("rewards.manage");
  const parsed = rewardSchema.safeParse({ ...Object.fromEntries(form), is_active: bool(form, "is_active") });
  if (!parsed.success) return { error: "validation", fieldErrors: fieldErrorsFrom(parsed.error) };
  const v = { name: parsed.data.name, description: parsed.data.description || null, cost: parsed.data.cost, stock: parsed.data.stock === "" || parsed.data.stock === undefined ? null : parsed.data.stock, is_active: parsed.data.is_active };
  const supabase = await createClient();
  const { error } = rewardId
    ? await supabase.from("rewards").update(v).eq("id", id.parse(rewardId))
    : await supabase.from("rewards").insert({ ...v, merchant_id: merchantId, program_id: id.parse(programId) });
  if (error) return { error: error.code === "42501" ? "forbidden" : "generic" };
  revalidatePath(`/dashboard/programs/${programId}`);
  revalidatePath("/dashboard/rewards");
  return { ok: true };
}

export async function deleteReward(programId: string, rewardId: string) {
  await requireMerchant("rewards.manage");
  const supabase = await createClient();
  const { error } = await supabase.from("rewards").delete().eq("id", id.parse(rewardId));
  if (error) await supabase.from("rewards").update({ is_active: false }).eq("id", rewardId); // referenced by history → deactivate instead
  revalidatePath(`/dashboard/programs/${programId}`);
}

export async function createLink(programId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const { merchantId } = await requireMerchant("programs.manage");
  const parsed = linkSchema.safeParse({ name: form.get("name"), require_phone: bool(form, "require_phone"), require_email: bool(form, "require_email"), collect_birthday: bool(form, "collect_birthday") });
  if (!parsed.success) return { error: "validation", fieldErrors: fieldErrorsFrom(parsed.error) };
  if (!parsed.data.require_phone && !parsed.data.require_email) parsed.data.require_phone = true; // need at least one identifier
  const supabase = await createClient();
  const { error } = await supabase.from("enrollment_links").insert({ merchant_id: merchantId, program_id: id.parse(programId), ...parsed.data });
  if (error) return { error: "generic" };
  revalidatePath(`/dashboard/programs/${programId}`);
  return { ok: true };
}

export async function toggleLink(programId: string, linkId: string, active: boolean) {
  await requireMerchant("programs.manage");
  const supabase = await createClient();
  await supabase.from("enrollment_links").update({ is_active: active }).eq("id", id.parse(linkId));
  revalidatePath(`/dashboard/programs/${programId}`);
}
