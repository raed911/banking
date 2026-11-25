"use server";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMerchant } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/phone";
import type { ActionState } from "@/lib/action";
import { refreshWalletMerchant } from "@/lib/wallet/sync";

const opt = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export async function saveSettings(_: ActionState, form: FormData): Promise<ActionState> {
  const { merchantId } = await requireMerchant("settings.manage");
  const parsed = z.object({
    name: z.string().trim().min(2).max(80), legal_name: opt(120), tax_id: opt(40), email: opt(254), phone: opt(30), website: opt(200),
    address: opt(200), city: opt(60), locale: z.enum(["fr", "ar", "en"]), brand_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/), logo_path: opt(300),
    maps_url: z.url({ protocol: /^https$/ }).max(500).optional().or(z.literal("")),
    review_url: z.url({ protocol: /^https$/ }).max(500).optional().or(z.literal("")),
  }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues.some((i) => i.path[0] === "maps_url" || i.path[0] === "review_url") ? "invalid_link" : "error" };
  const v = parsed.data;
  const phone = v.phone ? normalizePhone(v.phone) : null;
  if (v.phone && !phone) return { error: "invalid_phone" };
  if (v.logo_path && !v.logo_path.startsWith(`${merchantId}/`)) return { error: "error" };
  const supabase = await createClient();
  const { error } = await supabase.from("merchants").update({
    name: v.name, legal_name: v.legal_name || null, tax_id: v.tax_id || null, email: v.email || null, phone, website: v.website || null,
    address: v.address || null, city: v.city || null, locale: v.locale, brand_color: v.brand_color.toUpperCase(), logo_path: v.logo_path || null,
    maps_url: v.maps_url || null, review_url: v.review_url || null,
  }).eq("id", merchantId);
  if (error) return { error: "error" };
  revalidatePath("/dashboard", "layout");
  after(() => refreshWalletMerchant(merchantId).catch(() => undefined)); // name/logo/language appear on issued passes
  return { ok: true };
}

const locSchema = z.object({ name: z.string().trim().min(1).max(80), address: opt(200), city: opt(60), phone: opt(30) });

export async function saveLocation(locationId: string | null, _: ActionState, form: FormData): Promise<ActionState> {
  const { merchantId } = await requireMerchant("locations.manage");
  const parsed = locSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "error" };
  const v = { name: parsed.data.name, address: parsed.data.address || null, city: parsed.data.city || null, phone: parsed.data.phone ? normalizePhone(parsed.data.phone) : null, is_active: form.get("is_active") === "on" };
  const supabase = await createClient();
  const { error } = locationId
    ? await supabase.from("locations").update(v).eq("id", z.uuid().parse(locationId))
    : await supabase.from("locations").insert({ ...v, merchant_id: merchantId });
  if (error) return { error: error.message.includes("location_limit_reached") ? "limit" : "error" };
  revalidatePath("/dashboard/locations");
  return { ok: true };
}

export async function deleteLocation(locationId: string) {
  await requireMerchant("locations.manage");
  const supabase = await createClient();
  const { error } = await supabase.from("locations").delete().eq("id", z.uuid().parse(locationId));
  if (error) await supabase.from("locations").update({ is_active: false }).eq("id", locationId);
  revalidatePath("/dashboard/locations");
}
