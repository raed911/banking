import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { serverEnv } from "@/lib/env.server";

/**
 * Secret vault for integration credentials (AES-256-GCM, random 96-bit IV, authenticated).
 * Envelope: "v1.<iv b64url>.<tag b64url>.<ciphertext b64url>". The key (VAYRO_ENCRYPTION_KEY, 32 bytes base64)
 * lives only in the server environment; ciphertext lives in the database. Associated data binds a secret to
 * its owner row so a ciphertext cannot be copied to another merchant/provider.
 */
function key(raw?: string) {
  const k = Buffer.from(raw ?? serverEnv().VAYRO_ENCRYPTION_KEY, "base64");
  if (k.length !== 32) throw new Error("VAYRO_ENCRYPTION_KEY must be 32 bytes (base64)");
  return k;
}

export function encryptSecret(plaintext: string, aad: string, rawKey?: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(rawKey), iv);
  c.setAAD(Buffer.from(aad));
  const ct = Buffer.concat([c.update(plaintext, "utf8"), c.final()]);
  return `v1.${iv.toString("base64url")}.${c.getAuthTag().toString("base64url")}.${ct.toString("base64url")}`;
}

export function decryptSecret(envelope: string, aad: string, rawKey?: string) {
  const [v, iv, tag, ct] = envelope.split(".");
  if (v !== "v1" || !iv || !tag || !ct) throw new Error("invalid secret envelope");
  const d = createDecipheriv("aes-256-gcm", key(rawKey), Buffer.from(iv, "base64url"));
  d.setAAD(Buffer.from(aad));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString("utf8");
}

/** Last characters only, for display ("…a1f3"). */
export const hint = (s: string) => (s.length > 8 ? `…${s.slice(-4)}` : "••••");
