import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { addObjectMessage } from "@/lib/wallet/google";
import { googleCredsFor } from "@/lib/wallet/google-sync";
import { appleCredsFor, notifyApplePasses } from "@/lib/wallet/apple-sync";

import { renderMessage } from "@/lib/campaign-message";
export { renderMessage };

type Result = { done: boolean; sent: number; failed: number; skipped: number; waiting?: string };

/**
 * Sends a batch of pending deliveries for a Wallet campaign:
 *  - Google Wallet: object message with notification;
 *  - Apple Wallet: the message becomes the pass's "news" field (changeMessage → lock-screen notification), then an APNs push.
 */
export async function sendWalletCampaignBatch(campaignId: string, batch = 200): Promise<Result> {
  const db = createAdminClient();
  const { data: c } = await db.from("campaigns").select("id, merchant_id, name, channel, status, content, program_id, merchant:merchants(name)").eq("id", campaignId).single();
  if (!c || !["scheduled", "sending"].includes(c.status)) return { done: true, sent: 0, failed: 0, skipped: 0 };
  const creds = await googleCredsFor(c.merchant_id);
  const apple = await appleCredsFor(c.merchant_id).catch(() => null);
  if (!creds && !apple) return { done: false, sent: 0, failed: 0, skipped: 0, waiting: "wallet_channel_not_connected" };
  if (c.status === "scheduled") await db.from("campaigns").update({ status: "sending" }).eq("id", c.id);

  const { data: deliveries } = await db.from("campaign_deliveries").select("id, customer_id, customer:customers(first_name)").eq("campaign_id", c.id).eq("status", "pending").limit(batch);
  let sent = 0, failed = 0, skipped = 0;
  const now = new Date(), end = new Date(Date.now() + 7 * 86400000);
  const applePassIds: string[] = [];
  for (const d of deliveries ?? []) {
    const { data: passes } = await db.from("wallet_passes").select("id, platform, google_object_id, card:loyalty_cards!inner(customer_id, program_id)").is("removed_at", null).eq("card.customer_id", d.customer_id);
    const mine = (passes ?? []).filter((p) => !c.program_id || p.card.program_id === c.program_id);
    const targets = creds ? mine.filter((p) => p.platform === "google" && p.google_object_id) : [];
    const appleTargets = apple ? mine.filter((p) => p.platform === "apple") : [];
    if (!targets.length && !appleTargets.length) { await db.from("campaign_deliveries").update({ status: "skipped", error: "no_wallet_pass" }).eq("id", d.id); skipped++; continue; }
    try {
      const body = renderMessage(String((c.content as { body?: string }).body ?? ""), { prenom: d.customer?.first_name ?? "", commerce: c.merchant?.name ?? "" });
      for (const p of targets) await addObjectMessage(creds!, p.google_object_id!, { id: `campaign-${c.id}`, header: c.merchant?.name ?? c.name, body, notify: true, start: now, end });
      applePassIds.push(...appleTargets.map((p) => p.id));
      await db.from("campaign_deliveries").update({ status: "sent", sent_at: new Date().toISOString(), error: null }).eq("id", d.id); sent++;
    } catch (e) {
      await db.from("campaign_deliveries").update({ status: "failed", error: e instanceof Error ? e.message.slice(0, 200) : "error" }).eq("id", d.id); failed++;
    }
  }
  // Apple: deliveries are marked sent first, so the rebuilt passes carry the message; then wake the devices.
  if (apple && applePassIds.length) await notifyApplePasses(applePassIds, apple).catch(async (e) => {
    await db.from("system_logs").insert({ level: "error", source: "wallet.apple.campaign", message: e instanceof Error ? e.message.slice(0, 300) : "error", context: { campaign_id: c.id } });
  });
  const { count: remaining } = await db.from("campaign_deliveries").select("id", { count: "exact", head: true }).eq("campaign_id", c.id).eq("status", "pending");
  const tally = async (status: string) => (await db.from("campaign_deliveries").select("id", { count: "exact", head: true }).eq("campaign_id", c.id).eq("status", status)).count ?? 0;
  const [s, f, k] = await Promise.all([tally("sent"), tally("failed"), tally("skipped")]);
  const { data: cur } = await db.from("campaigns").select("stats").eq("id", c.id).single();
  const done = (remaining ?? 0) === 0;
  await db.from("campaigns").update({ stats: { ...(cur?.stats as object), sent: s, failed: f, skipped: k }, ...(done ? { status: "sent", sent_at: new Date().toISOString() } : {}) }).eq("id", c.id);
  if (done) await db.from("notifications").insert({ merchant_id: c.merchant_id, type: "campaign.sent", title: "Campagne envoyée", body: `${c.name} : ${s} envoyés`, link: "/dashboard/campaigns" });
  return { done, sent, failed, skipped };
}
