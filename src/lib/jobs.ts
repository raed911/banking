import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshGoogleCardIfIssued, refreshGoogleMerchant } from "@/lib/wallet/google-sync";
import { integrationRow } from "@/lib/integrations";

type Job = { id: number; kind: string; payload: Record<string, string> };
type Outcome = { ok: true } | { ok: false; error: string; deferSeconds?: number };

async function handle(job: Job): Promise<Outcome> {
  switch (job.kind) {
    case "wallet.update":
      await refreshGoogleCardIfIssued(job.payload.card_id!);
      return { ok: true };
    case "wallet.refresh_merchant":
      await refreshGoogleMerchant(job.payload.merchant_id!);
      return { ok: true };
    case "campaign.send": {
      const db = createAdminClient();
      const { data: c } = await db.from("campaigns").select("id, merchant_id, channel, status").eq("id", job.payload.campaign_id!).maybeSingle();
      if (!c || c.status !== "scheduled") return { ok: true };
      const provider = c.channel === "email" ? "resend" : null;
      const ready = provider ? ((await integrationRow(provider as never, c.merchant_id)) ?? (await integrationRow(provider as never, null)))?.status === "verified" : false;
      // Delivery providers are not connected yet: keep the campaign scheduled and check again in an hour.
      if (!ready) return { ok: false, error: `${c.channel}_channel_not_connected`, deferSeconds: 3600 };
      return { ok: false, error: "sender_not_implemented", deferSeconds: 3600 };
    }
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
