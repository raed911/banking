"use server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { processCampaign } from "@/lib/jobs";
import { z } from "zod";
import { requireMerchant } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/action";

const segmentSchema = z.object({
  type: z.enum(["all", "inactive", "active", "new", "birthday_month", "tag", "program"]),
  days: z.coerce.number().int().min(1).max(730).optional(),
  tag: z.string().trim().max(40).optional(),
  program_id: z.uuid().optional(),
});
export type Segment = z.infer<typeof segmentSchema>;

function segmentFrom(form: FormData): Segment | null {
  const raw = { type: form.get("segment_type"), days: form.get("segment_days") || undefined, tag: form.get("segment_tag") || undefined, program_id: form.get("segment_program") || undefined };
  const p = segmentSchema.safeParse(raw);
  if (!p.success) return null;
  if (p.data.type === "tag" && !p.data.tag) return null;
  if (p.data.type === "program" && !p.data.program_id) return null;
  return p.data;
}

export async function audienceCount(segment: Segment, channel: "email" | "wallet" | "card") {
  const { merchantId } = await requireMerchant("campaigns.manage");
  const supabase = await createClient();
  const { data } = await supabase.rpc("campaign_audience_count", { p_merchant_id: merchantId, p_segment: segmentSchema.parse(segment), p_channel: channel });
  return data as { eligible: number; segment_total: number; without_consent: number } | null;
}

export async function saveCampaign(campaignId: string | null, _: ActionState, form: FormData): Promise<ActionState> {
  const { merchantId, user } = await requireMerchant("campaigns.manage");
  const segment = segmentFrom(form);
  const parsed = z.object({
    name: z.string().trim().min(2).max(120), channel: z.enum(["email", "wallet", "card"]), subject: z.string().trim().max(150).optional().or(z.literal("")),
    body: z.string().trim().min(3).max(1000), coupon_id: z.uuid().optional().or(z.literal("")), send_at: z.string().optional().or(z.literal("")),
  }).safeParse(Object.fromEntries(form));
  if (!parsed.success || !segment) return { error: "validation" };
  const v = parsed.data;
  if (v.channel === "email" && !v.subject) return { error: "validation" };
  const row = { name: v.name, channel: v.channel, segment, subject: v.subject || null, content: { body: v.body }, coupon_id: v.coupon_id || null, scheduled_at: v.send_at ? new Date(v.send_at).toISOString() : null };
  const supabase = await createClient();
  let id = campaignId;
  if (id) {
    const { data: current } = await supabase.from("campaigns").select("status").eq("id", z.uuid().parse(id)).maybeSingle();
    if (!current || !["draft", "scheduled"].includes(current.status)) return { error: "not_editable" }; // already sent: duplicate it instead
    const { error } = await supabase.from("campaigns").update(row).eq("id", id);
    if (error) return { error: "generic" };
  } else {
    const { data, error } = await supabase.from("campaigns").insert({ ...row, merchant_id: merchantId, created_by: user.id }).select("id").single();
    if (error || !data) return { error: "generic" };
    id = data.id;
  }
  if (form.get("intent") === "schedule") {
    const { data, error } = await supabase.rpc("schedule_campaign", { p_campaign_id: id!, p_send_at: row.scheduled_at ?? undefined });
    if (error) return { error: error.message.includes("subscription_inactive") ? "subscription_inactive" : error.message.includes("not_editable") ? "not_editable" : "generic" };
    if (!row.scheduled_at || new Date(row.scheduled_at) <= new Date()) { const cid = id!; after(() => processCampaign(cid).then(() => revalidatePath("/dashboard/campaigns")).catch(() => undefined)); } // send now, worker is the fallback
    revalidatePath("/dashboard/campaigns");
    return { ok: true, data: { recipients: (data as { recipients: number }).recipients } };
  }
  revalidatePath("/dashboard/campaigns");
  return { ok: true };
}

export async function cancelCampaign(id: string) {
  await requireMerchant("campaigns.manage");
  const supabase = await createClient();
  await supabase.from("campaigns").update({ status: "canceled" }).eq("id", z.uuid().parse(id));
  revalidatePath("/dashboard/campaigns");
}

export async function deleteCampaign(id: string) {
  await requireMerchant("campaigns.manage");
  const supabase = await createClient();
  await supabase.from("campaigns").delete().eq("id", z.uuid().parse(id));
  revalidatePath("/dashboard/campaigns");
}
