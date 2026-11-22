import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshGoogleCardIfIssued, refreshGoogleMerchant } from "@/lib/wallet/google-sync";
import { integrationRow } from "@/lib/integrations";
import { sendWalletCampaignBatch } from "@/lib/campaign-sender";

type Job = { id: number; kind: string; payload: Record<string, string> };
type Outcome = { ok: true } | { ok: false; error: string; deferSeconds?: number };

/** Sends (or defers) one scheduled campaign. Safe to call repeatedly. */
export async function processCampaign(campaignId: string): Promise<Outcome> {
      const db = createAdminClient();
      const { data: c } = await db.from("campaigns").select("id, merchant_id, channel, status").eq("id", campaignId).maybeSingle();
      if (!c || !["scheduled", "sending"].includes(c.status)) return { ok: true };
      if (c.channel === "card") {
        // In-card announcement: visible on every recipient's card page right away.
        const db2 = createAdminClient();
        await db2.from("campaign_deliveries").update({ status: "sent", sent_at: new Date().toISOString() }).eq("campaign_id", c.id).eq("status", "pending");
        const { count } = await db2.from("campaign_deliveries").select("id", { count: "exact", head: true }).eq("campaign_id", c.id).eq("status", "sent");
        const { data: cur } = await db2.from("campaigns").select("stats").eq("id", c.id).single();
        await db2.from("campaigns").update({ status: "sent", sent_at: new Date().toISOString(), stats: { ...(cur?.stats as object), sent: count ?? 0 } }).eq("id", c.id);
        return { ok: true };
      }
      if (c.channel === "wallet") {
        const r = await sendWalletCampaignBatch(c.id);
        if (r.waiting) return { ok: false, error: r.waiting, deferSeconds: 3600 };
        if (!r.done) return { ok: false, error: "more_batches", deferSeconds: 5 };
        return { ok: true };
      }
      const provider = c.channel === "email" ? "resend" : null;
      const ready = provider ? ((await integrationRow(provider as never, c.merchant_id)) ?? (await integrationRow(provider as never, null)))?.status === "verified" : false;
      // Delivery providers are not connected yet: keep the campaign scheduled and check again in an hour.
      if (!ready) return { ok: false, error: `${c.channel}_channel_not_connected`, deferSeconds: 3600 };
      return { ok: false, error: "sender_not_implemented", deferSeconds: 3600 };
    }

async function handle(job: Job): Promise<Outcome> {
  switch (job.kind) {
    case "wallet.update":
      await refreshGoogleCardIfIssued(job.payload.card_id!);
      return { ok: true };
    case "wallet.refresh_merchant":
      await refreshGoogleMerchant(job.payload.merchant_id!);
      return { ok: true };
    case "campaign.send":
      return processCampaign(job.payload.campaign_id!);
    default:
      return { ok: false, error: `unknown_job_kind:${job.kind}` };
  }
}

/** Claims due jobs and runs them; failures retry with exponential backoff (see worker_finish_job). */
export async function runDueJobs(limit = 20, budgetMs = 50_000) {
  const db = createAdminClient();
  const started = Date.now();
  const { data: jobs, error } = await db.rpc("worker_claim_jobs", { p_limit: limit });
  if (error) throw error;
  const results: { id: number; kind: string; ok: boolean; error?: string }[] = [];
  for (const job of (jobs ?? []) as Job[]) {
    if (Date.now() - started > budgetMs) { await db.rpc("worker_finish_job", { p_id: job.id, p_ok: false, p_error: "time_budget", p_defer_seconds: 5 }); continue; }
    let out: Outcome;
    try { out = await handle(job); } catch (e) { out = { ok: false, error: e instanceof Error ? e.message.slice(0, 300) : "error" }; }
    await db.rpc("worker_finish_job", { p_id: job.id, p_ok: out.ok, p_error: out.ok ? undefined : out.error, p_defer_seconds: out.ok ? undefined : out.deferSeconds });
    results.push({ id: job.id, kind: job.kind, ok: out.ok, error: out.ok ? undefined : out.error });
  }
  return results;
}
