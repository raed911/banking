import { NextResponse } from "next/server";
import { getPublicCard } from "@/lib/loyalty/public-card";
import { clientIp, rateLimit } from "@/lib/request";
import { createAdminClient } from "@/lib/supabase/admin";
import { appleCredsFor, buildApplePass, ensureApplePass } from "@/lib/wallet/apple-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** "Add to Apple Wallet": returns the signed .pkpass; iOS Safari opens it in the Wallet sheet. */
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://vayro-app.vercel.app";
  if (!(await rateLimit(`awallet:${await clientIp()}`, 20, 600))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const data = await getPublicCard(token);
  if (!data || data.card.status !== "active" || data.card.merchant?.status !== "active") return NextResponse.json({ error: "not_found" }, { status: 404 });
  try {
    const creds = await appleCredsFor(data.card.merchant_id);
    if (!creds) return NextResponse.redirect(new URL(`/c/${token}?wallet=error`, appUrl), 302);
    const { pkpass, card } = await buildApplePass(data.card.id, creds);
    await ensureApplePass(card, creds);
    return new Response(new Uint8Array(pkpass), {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `attachment; filename="${card.serial}.pkpass"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    await createAdminClient().from("system_logs").insert({ level: "error", source: "wallet.apple.download", message: e instanceof Error ? e.message.slice(0, 500) : "unknown", context: { card_id: data.card.id } });
    return NextResponse.redirect(new URL(`/c/${token}?wallet=error`, appUrl), 302);
  }
}
