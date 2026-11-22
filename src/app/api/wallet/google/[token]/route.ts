import { NextResponse } from "next/server";
import { getPublicCard } from "@/lib/loyalty/public-card";
import { clientIp, rateLimit } from "@/lib/request";
import { createAdminClient } from "@/lib/supabase/admin";
import { saveToWalletUrl } from "@/lib/wallet/google";
import { syncGoogleCard } from "@/lib/wallet/google-sync";

export const dynamic = "force-dynamic";

/** "Add to Google Wallet": publish/update the card on Google, then redirect to Google's save page. */
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!(await rateLimit(`gwallet:${await clientIp()}`, 20, 600))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const data = await getPublicCard(token);
  if (!data || data.card.status !== "active" || data.card.merchant?.status !== "active") return NextResponse.json({ error: "not_found" }, { status: 404 });
  try {
    const { objectId, creds } = await syncGoogleCard(data.card.id);
    await createAdminClient().from("wallet_passes").update({ installed_at: new Date().toISOString() }).eq("card_id", data.card.id).eq("platform", "google").is("installed_at", null);
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://vayro-app.vercel.app";
    return NextResponse.redirect(saveToWalletUrl(creds, objectId, [origin]), 302);
  } catch (e) {
    await createAdminClient().from("system_logs").insert({ level: "error", source: "wallet.google.save", message: e instanceof Error ? e.message.slice(0, 500) : "unknown", context: { card_id: data.card.id } });
    return NextResponse.redirect(new URL(`/c/${token}?wallet=error`, process.env.NEXT_PUBLIC_APP_URL ?? "https://vayro-app.vercel.app"), 302);
  }
}
