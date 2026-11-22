"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMerchant, requirePlatformAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret, encryptSecret, hint } from "@/lib/crypto/vault";
import { integrationRow as current, loadCredentials, secretAad as aad } from "@/lib/integrations";
import { normalizePrivateKey, verifyGoogleCredentials } from "@/lib/wallet/google";
import { inspectAppleCertificate } from "@/lib/wallet/apple-cert";
import type { ActionState } from "@/lib/action";

type Provider = "google_wallet" | "apple_wallet";
type Scope = { kind: "platform" } | { kind: "merchant" };

async function resolveScope(scope: Scope) {
  if (scope.kind === "platform") { const u = await requirePlatformAdmin(); return { merchantId: null as string | null, userId: u.id }; }
  const { merchantId, user } = await requireMerchant("integrations.manage");
  return { merchantId, userId: user.id };
}
export async function saveIntegration(scope: Scope, provider: Provider, _: ActionState, form: FormData): Promise<ActionState> {
  const { merchantId, userId } = await resolveScope(scope);
  const existing = await current(provider, merchantId);
  const prevSecrets = existing?.secret_ciphertext ? (JSON.parse(decryptSecret(existing.secret_ciphertext, aad(provider, merchantId))) as Record<string, string>) : {};
  const s = (k: string) => String(form.get(k) ?? "").trim();
  let config: Record<string, string>, secrets: Record<string, string>, hints: Record<string, string>;
  if (provider === "google_wallet") {
    const p = z.object({ issuerId: z.string().regex(/^\d{10,25}$/), serviceAccountEmail: z.email().regex(/\.gserviceaccount\.com$/) }).safeParse({ issuerId: s("issuerId"), serviceAccountEmail: s("serviceAccountEmail") });
    if (!p.success) return { error: "validation" };
    let privateKey = s("privateKey") || prevSecrets.privateKey || "";
    try { privateKey = normalizePrivateKey(privateKey); } catch { return { error: "invalid_private_key" }; }
    config = p.data; secrets = { privateKey }; hints = { privateKey: hint(privateKey.replace(/-----[^-]+-----|\s/g, "")) };
  } else {
    const p = z.object({ teamId: z.string().regex(/^[A-Z0-9]{10}$/), passTypeIdentifier: z.string().regex(/^pass\.[A-Za-z0-9.-]+$/) }).safeParse({ teamId: s("teamId").toUpperCase(), passTypeIdentifier: s("passTypeIdentifier") });
    if (!p.success) return { error: "validation" };
    secrets = { certificate: s("certificate") || prevSecrets.certificate || "", privateKey: s("privateKey") || prevSecrets.privateKey || "", password: String(form.get("password") ?? "") || prevSecrets.password || "" };
    if (!secrets.certificate) return { error: "certificate_unreadable" };
    const check = inspectAppleCertificate({ certificate: secrets.certificate!, privateKey: secrets.privateKey, password: secrets.password, passTypeIdentifier: p.data.passTypeIdentifier, teamId: p.data.teamId });
    if (!check.ok) return { error: check.error };
    config = { ...p.data, certificateExpiresAt: check.expiresAt };
    hints = { certificate: `exp. ${check.expiresAt.slice(0, 10)}` };
  }
  const row = { config, secret_ciphertext: encryptSecret(JSON.stringify(secrets), aad(provider, merchantId)), secret_hints: hints, status: "configured" as const, last_error: null, updated_by: userId };
  const db = createAdminClient();
  const { error } = existing ? await db.from("integrations").update(row).eq("id", existing.id) : await db.from("integrations").insert({ ...row, provider, merchant_id: merchantId });
  if (error) return { error: "generic" };
  await db.from("audit_logs").insert({ merchant_id: merchantId, actor_id: userId, actor_type: scope.kind === "platform" ? "admin" : "user", action: "integration.saved", entity_type: "integration", entity_id: provider, details: { config } });
  revalidatePath(scope.kind === "platform" ? "/admin/integrations" : "/dashboard/integrations");
  return { ok: true };
}

export async function testIntegration(scope: Scope, provider: Provider): Promise<{ ok: boolean; error?: string; detail?: string }> {
  const { merchantId } = await resolveScope(scope);
  const creds = await loadCredentials(provider, merchantId);
  if (!creds) return { ok: false, error: "not_configured" };
  const result = provider === "google_wallet"
    ? await verifyGoogleCredentials({ issuerId: creds.config.issuerId!, serviceAccountEmail: creds.config.serviceAccountEmail!, privateKey: creds.secrets.privateKey! })
    : inspectAppleCertificate({ certificate: creds.secrets.certificate!, privateKey: creds.secrets.privateKey, password: creds.secrets.password, passTypeIdentifier: creds.config.passTypeIdentifier!, teamId: creds.config.teamId! });
  const db = createAdminClient();
  const q = db.from("integrations").update(result.ok ? { status: "verified", last_verified_at: new Date().toISOString(), last_error: null } : { status: "error", last_error: result.error }).eq("provider", provider);
  await (merchantId ? q.eq("merchant_id", merchantId) : q.is("merchant_id", null));
  revalidatePath(scope.kind === "platform" ? "/admin/integrations" : "/dashboard/integrations");
  return result.ok ? { ok: true, detail: "issuerName" in result ? result.issuerName : undefined } : { ok: false, error: result.error };
}

export async function removeIntegration(scope: Scope, provider: Provider) {
  const { merchantId, userId } = await resolveScope(scope);
  const db = createAdminClient();
  const q = db.from("integrations").delete().eq("provider", provider);
  await (merchantId ? q.eq("merchant_id", merchantId) : q.is("merchant_id", null));
  await db.from("audit_logs").insert({ merchant_id: merchantId, actor_id: userId, actor_type: scope.kind === "platform" ? "admin" : "user", action: "integration.removed", entity_type: "integration", entity_id: provider });
  revalidatePath(scope.kind === "platform" ? "/admin/integrations" : "/dashboard/integrations");
}
