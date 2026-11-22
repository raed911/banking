import "server-only";
import type { IntegrationState } from "@/components/integrations/wallet-forms";
import { integrationRow, type WalletProvider } from "@/lib/integrations";

/** Public (non-secret) view of an integration for the settings UI. */
export async function integrationState(provider: WalletProvider, merchantId: string | null): Promise<IntegrationState> {
  const row = await integrationRow(provider, merchantId);
  if (!row) return null;
  return { status: row.status, config: row.config as Record<string, string>, hints: row.secret_hints as Record<string, string>, lastVerifiedAt: row.last_verified_at, lastError: row.last_error };
}
