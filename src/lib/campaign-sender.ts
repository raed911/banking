import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { addObjectMessage } from "@/lib/wallet/google";
import { googleCredsFor } from "@/lib/wallet/google-sync";

export const renderMessage = (tpl: string, vars: { prenom: string; commerce: string }) =>
  tpl.replaceAll("{prenom}", vars.prenom).replaceAll("{commerce}", vars.commerce);

type Result = { done: boolean; sent: number; failed: number; skipped: number; waiting?: string };

/** Sends a batch of pending deliveries for a Wallet campaign through Google Wallet object messages. */
export async function sendWalletCampaignBatch(campaignId: string, batch = 200): Promise<Result> {
  const db = createAdminClient();
  const { data: c } = await db.from("campaigns").select("id, merchant_id, name, channel, status, content, program_id, merchant:merchants(name)").eq("id", campaignId).single();
  if (!c || !["scheduled", "sending"].includes(c.status)) return { done: true, sent: 0, failed: 0, skipped: 0 };
  const creds = await googleCredsFor(c.merchant_id);
  if (!creds) return { done: false, sent: 0, failed: 0, skipped: 0, waiting: "wallet_channel_not_connected" };
  if (c.status === "scheduled") await db.from("campaigns").update({ status: "sending" }).eq("id", c.id);

  const { data: deliveries } = await db.from("campaign_deliveries").select("id, customer_id, customer:customers(first_name)").eq("campaign_id", c.id).eq("status", "pending").limit(batch);
  let sent = 0, failed = 0, skipped = 0;
  const now = new Date(), end = new Date(Date.now() + 7 * 86400000);
  for (const d of deliveries ?? []) {
    const { data: passes } = await db.from("wallet_passes").select("google_object_id, card:loyalty_cards!inner(customer_id, program_id)").eq("platform", "google").is("removed_at", null).eq("card.customer_id", d.customer_id);
    const targets = (passes ?? []).filter((p) => p.google_object_id && (!c.program_id || p.card.program_id === c.program_id));
    if (!targets.length) { await db.from("campaign_deliveries").update({ status: "skipped", error: "no_wallet_pass" }).eq("id", d.id); skipped++; continue; }
    try {
      const body = renderMessage(String((c.content as { body?: string }).body ?? ""), { prenom: d.customer?.first_name ?? "", commerce: c.merchant?.name ?? "" });
      for (const p of targets) await addObjectMessage(creds, p.google_object_id!, { id: `campaign-${c.id}`, header: c.merchant?.name ?? c.name, body, notify: true, start: now, end });
      await db.from("campaign_deliveries").update({ status: "sent", sent_at: new Date().toISOString(), error: null }).eq("id", d.id); sent++;
    } catch (e) {
      await db.from("campaign_deliveries").update({ status: "failed", error: e instanceof Error ? e.message.slice(0, 200) : "error" }).eq("id", d.id); failed++;
    }
  }
  const { count: remaining } = await db.from("campaign_deliveries").select("id", { count: "exact", head: true }).eq("campaign_id", c.id).eq("status", "pending");
  const tally = async (status: string) => (await db.from("campaign_deliveries").select("id", { count: "exact", head: true }).eq("campaign_id", c.id).eq("status", status)).count ?? 0;
  const [s, f, k] = await Promise.all([tally("sent"), tally("failed"), tally("skipped")]);
  const { data: cur } = await db.from("campaigns").select("stats").eq("id", c.id).single();
  const done = (remaining ?? 0) === 0;
  await db.from("campaigns").update({ stats: { ...(cur?.stats as object), sent: s, failed: f, skipped: k }, ...(done ? { status: "sent", sent_at: new Date().toISOString() } : {}) }).eq("id", c.id);
  if (done) await db.from("notifications").insert({ merchant_id: c.merchant_id, type: "campaign.sent", title: "Campagne envoyée", body: `${c.name} : ${s} envoyés`, link: "/dashboard/campaigns" });
  return { done, sent, failed, skipped };
}
