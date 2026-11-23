"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMerchant, requirePlatformAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret, encryptSecret, hint } from "@/lib/crypto/vault";
import { integrationRow as current, loadCredentials, secretAad as aad } from "@/lib/integrations";
import { normalizePrivateKey, verifyGoogleCredentials } from "@/lib/wallet/google";
import { certificateIdentity, createCsr, inspectAppleCertificate, signingMaterial } from "@/lib/wallet/apple-cert";
import { appleWwdrPem } from "@/lib/wallet/apple-wwdr";
import { signManifest } from "@/lib/wallet/apple-pass";
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
    const certificate = s("certificate") || prevSecrets.certificate || "";
    const password = String(form.get("password") ?? "") || prevSecrets.password || "";
    if (!certificate) return { error: "certificate_unreadable" };
    // The key comes from the .p12 itself, a pasted PEM, or the key generated with our CSR (pendingKey), else the current one.
    const tryKey = (k?: string) => inspectAppleCertificate({ certificate, privateKey: k, password, passTypeIdentifier: p.data.passTypeIdentifier, teamId: p.data.teamId });
    let privateKey = s("privateKey");
    let check = tryKey(privateKey || undefined);
    if (!privateKey && !check.ok && check.error === "private_key_missing") {
      for (const k of [prevSecrets.pendingKey, prevSecrets.privateKey].filter((x): x is string => !!x)) {
        privateKey = k; check = tryKey(k);
        if (check.ok || check.error !== "key_does_not_match_certificate") break;
      }
    }
    if (!check.ok) return { error: check.error };
    secrets = { certificate, privateKey, password };
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
    : await testApple(creds);
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

/** Apple: certificate checks + Apple WWDR chain download + a real test signature. */
async function testApple(creds: { config: Record<string, string>; secrets: Record<string, string> }) {
  const check = inspectAppleCertificate({ certificate: creds.secrets.certificate!, privateKey: creds.secrets.privateKey, password: creds.secrets.password, passTypeIdentifier: creds.config.passTypeIdentifier!, teamId: creds.config.teamId! });
  if (!check.ok) return check;
  let wwdr: string;
  try { wwdr = await appleWwdrPem(); } catch { return { ok: false as const, error: "wwdr_unavailable" }; }
  try { signManifest(Buffer.from("{}"), signingMaterial({ certificate: creds.secrets.certificate!, privateKey: creds.secrets.privateKey, password: creds.secrets.password }), wwdr); }
  catch { return { ok: false as const, error: "signature_failed" }; }
  return check;
}

/**
 * Step 1 of the Apple assistant: VAYRO creates the private key and a Certificate Signing Request.
 * The key is stored encrypted as `pendingKey` (the live key, if any, keeps working until the new certificate is saved).
 */
export async function generateAppleCsr(scope: Scope): Promise<{ ok: true; csr: string } | { ok: false; error: string }> {
  const { merchantId, userId } = await resolveScope(scope);
  const existing = await current("apple_wallet", merchantId);
  const prev = existing?.secret_ciphertext ? (JSON.parse(decryptSecret(existing.secret_ciphertext, aad("apple_wallet", merchantId))) as Record<string, string>) : {};
  const { csrPem, keyPem } = createCsr("VAYRO Pass Type ID");
  const db = createAdminClient();
  const secret_ciphertext = encryptSecret(JSON.stringify({ ...prev, pendingKey: keyPem }), aad("apple_wallet", merchantId));
  const { error } = existing
    ? await db.from("integrations").update({ secret_ciphertext, updated_by: userId }).eq("id", existing.id)
    : await db.from("integrations").insert({ provider: "apple_wallet", merchant_id: merchantId, config: {}, secret_ciphertext, secret_hints: {}, status: "not_configured", updated_by: userId });
  if (error) return { ok: false, error: "generic" };
  await db.from("audit_logs").insert({ merchant_id: merchantId, actor_id: userId, actor_type: scope.kind === "platform" ? "admin" : "user", action: "integration.csr_created", entity_type: "integration", entity_id: "apple_wallet" });
  return { ok: true, csr: csrPem };
}

/** Reads Pass Type ID + Team ID from an uploaded certificate so the form fills itself. */
export async function readAppleCertificate(scope: Scope, certificate: string, password?: string) {
  await resolveScope(scope);
  try {
    const id = certificateIdentity(z.string().min(100).max(20000).parse(certificate), password);
    return id ?? { passTypeIdentifier: null, teamId: null };
  } catch {
    return { passTypeIdentifier: null, teamId: null };
  }
}
