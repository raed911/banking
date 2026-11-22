import { NextResponse } from "next/server";
import { getPublicCard } from "@/lib/loyalty/public-card";
import { createCardQrToken } from "@/lib/loyalty/qr-token";
import { clientIp, rateLimit } from "@/lib/request";

export const dynamic = "force-dynamic";

/** Issues a fresh short-lived signed QR payload for the card identified by its secret token. */
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!(await rateLimit(`card-qr:${await clientIp()}`, 120, 600))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const data = await getPublicCard(token);
  if (!data || data.card.status !== "active") return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(createCardQrToken(data.card.id), { headers: { "Cache-Control": "no-store" } });
}
