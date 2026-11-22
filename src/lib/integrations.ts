import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/crypto/vault";

export type WalletProvider = "google_wallet" | "apple_wallet";
export const secretAad = (p: WalletProvider, merchantId: string | null) => `${p}:${merchantId ?? "platform"}`;

export async function integrationRow(provider: WalletProvider, merchantId: string | null) {
  const q = createAdminClient().from("integrations").select("*").eq("provider", provider);
  const { data } = merchantId ? await q.eq("merchant_id", merchantId).maybeSingle() : await q.is("merchant_id", null).maybeSingle();
  return data;
}

/** Decrypted credentials — SERVER ONLY. Never return these to a client or log them. */
export async function loadCredentials(provider: WalletProvider, merchantId: string | null) {
  const row = await integrationRow(provider, merchantId);
  if (!row?.secret_ciphertext) return null;
  return { config: row.config as Record<string, string>, secrets: JSON.parse(decryptSecret(row.secret_ciphertext, secretAad(provider, merchantId))) as Record<string, string>, status: row.status };
}

/** Merchant credentials if the merchant brought their own, else the platform's. */
export async function effectiveCredentials(provider: WalletProvider, merchantId: string) {
  return (await loadCredentials(provider, merchantId)) ?? (await loadCredentials(provider, null));
}
