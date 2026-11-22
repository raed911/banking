"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMerchant } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/action";

export async function saveZone(locationId: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireMerchant("locations.manage");
  const parsed = z.object({
    latitude: z.coerce.number().min(-90).max(90), longitude: z.coerce.number().min(-180).max(180),
    geo_radius_m: z.coerce.number().int().min(20).max(1000), geo_message: z.string().trim().max(120).optional().or(z.literal("")),
  }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "coordsRequired" };
  const supabase = await createClient();
  const { error } = await supabase.from("locations").update({
    latitude: parsed.data.latitude, longitude: parsed.data.longitude, geo_radius_m: parsed.data.geo_radius_m,
    geo_message: parsed.data.geo_message || null, geo_enabled: form.get("geo_enabled") === "on",
  }).eq("id", z.uuid().parse(locationId));
  if (error) return { error: "error" };
  revalidatePath("/dashboard/location-marketing");
  return { ok: true };
}

const campaignSchema = z.object({
  name: z.string().trim().min(2).max(80), message: z.string().trim().min(3).max(120),
  starts_at: z.string().min(10), ends_at: z.string().min(10), coupon_id: z.uuid().optional().or(z.literal("")),
});

export async function saveLocationCampaign(campaignId: string | null, _: ActionState, form: FormData): Promise<ActionState> {
  const { merchantId, user } = await requireMerchant("campaigns.manage");
  const parsed = campaignSchema.safeParse(Object.fromEntries(form));
  const locationIds = z.array(z.uuid()).min(1).max(10).safeParse(form.getAll("location_ids"));
  const programIds = z.array(z.uuid()).max(50).safeParse(form.getAll("program_ids"));
  if (!parsed.success || !locationIds.success || !programIds.success) return { error: "validation" };
  const starts = new Date(parsed.data.starts_at), ends = new Date(parsed.data.ends_at);
  if (!(ends > starts) || Number.isNaN(+starts)) return { error: "validation" };
  const draft = form.get("intent") === "draft";
  const status = draft ? "draft" : starts <= new Date() ? "active" : "scheduled";
  const row = {
    name: parsed.data.name, message: parsed.data.message, location_ids: locationIds.data, program_ids: programIds.data.length ? programIds.data : null,
    starts_at: starts.toISOString(), ends_at: ends.toISOString(), coupon_id: parsed.data.coupon_id || null, status,
  } as const;
  const supabase = await createClient();
  const { error } = campaignId
    ? await supabase.from("location_campaigns").update(row).eq("id", z.uuid().parse(campaignId))
    : await supabase.from("location_campaigns").insert({ ...row, merchant_id: merchantId, created_by: user.id });
  if (error) return { error: error.code === "42501" || error.code === "23514" ? "validation" : "generic" };
  revalidatePath("/dashboard/location-marketing");
  return { ok: true };
}

export async function setLocationCampaignStatus(campaignId: string, status: "paused" | "active" | "ended") {
  await requireMerchant("campaigns.manage");
  const supabase = await createClient();
  const id = z.uuid().parse(campaignId);
  if (status === "active") {
    const { data } = await supabase.from("location_campaigns").select("starts_at").eq("id", id).single();
    await supabase.from("location_campaigns").update({ status: data && new Date(data.starts_at) > new Date() ? "scheduled" : "active" }).eq("id", id);
  } else {
    await supabase.from("location_campaigns").update(status === "ended" ? { status, ends_at: new Date().toISOString() } : { status }).eq("id", id);
  }
  revalidatePath("/dashboard/location-marketing");
}

export async function deleteLocationCampaign(campaignId: string) {
  await requireMerchant("campaigns.manage");
  const supabase = await createClient();
  await supabase.from("location_campaigns").delete().eq("id", z.uuid().parse(campaignId));
  revalidatePath("/dashboard/location-marketing");
}

/** Resolves a Google Maps share link (short or full) to coordinates. Only Google hosts are fetched (no SSRF). */
export async function resolveMapsLink(input: string): Promise<{ lat: number; lng: number } | null> {
  await requireMerchant("locations.manage");
  const { coordsFromMapsUrl, GOOGLE_MAPS_HOSTS, SHORT_MAPS_HOSTS } = await import("@/lib/maps-link");
  const text = input.trim().slice(0, 2000);
  const direct = coordsFromMapsUrl(text);
  if (direct) return direct;
  let url: URL;
  try { url = new URL(text.match(/https?:\/\/\S+/)?.[0] ?? text); } catch { return null; }
  for (let hop = 0; hop < 5; hop++) {
    if (url.protocol !== "https:" || !(SHORT_MAPS_HOSTS.includes(url.hostname) || GOOGLE_MAPS_HOSTS.test(url.hostname))) return null;
    const res = await fetch(url, { redirect: "manual", headers: { "User-Agent": "Mozilla/5.0 (VAYRO location setup)" } }).catch(() => null);
    const loc = res?.headers.get("location");
    if (!loc) {
      const body = res ? (await res.text()).slice(0, 200_000) : "";
      return coordsFromMapsUrl(body.match(/https:\/\/www\.google\.[a-z.]+\/maps\/[^"'\s]+/)?.[0] ?? "") ?? coordsFromMapsUrl(url.toString());
    }
    url = new URL(loc, url);
    const found = coordsFromMapsUrl(url.toString());
    if (found) return found;
  }
  return null;
}
