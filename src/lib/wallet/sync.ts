import "server-only";
import { refreshGoogleCardIfIssued, refreshGoogleMerchant } from "./google-sync";
import { refreshAppleCardIfIssued, refreshAppleMerchant } from "./apple-sync";

/** Pushes a card's current state to every Wallet pass it has (Google + Apple); one platform failing never blocks the other. */
export async function refreshWalletCard(cardId: string) {
  const [g, a] = await Promise.allSettled([refreshGoogleCardIfIssued(cardId), refreshAppleCardIfIssued(cardId)]);
  const errors = [g, a].filter((r): r is PromiseRejectedResult => r.status === "rejected").map((r) => String(r.reason instanceof Error ? r.reason.message : r.reason));
  if (errors.length) throw new Error(errors.join(" | ").slice(0, 300));
}

export async function refreshWalletMerchant(merchantId: string) {
  const [g, a] = await Promise.allSettled([refreshGoogleMerchant(merchantId), refreshAppleMerchant(merchantId)]);
  const errors = [g, a].filter((r): r is PromiseRejectedResult => r.status === "rejected").map((r) => String(r.reason instanceof Error ? r.reason.message : r.reason));
  if (errors.length) throw new Error(errors.join(" | ").slice(0, 300));
}
