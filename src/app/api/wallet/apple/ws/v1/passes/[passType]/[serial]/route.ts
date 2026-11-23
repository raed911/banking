import { createAdminClient } from "@/lib/supabase/admin";
import { appleCredsFor, buildApplePass, checkAppleAuth } from "@/lib/wallet/apple-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** PassKit web service: latest version of a pass (304 when unchanged since If-Modified-Since). */
export async function GET(req: Request, { params }: { params: Promise<{ passType: string; serial: string }> }) {
  const { passType, serial } = await params;
  if (!checkAppleAuth(req.headers.get("authorization"), serial)) return new Response(null, { status: 401 });
  const db = createAdminClient();
  const { data: pass } = await db.from("wallet_passes").select("id, card_id, merchant_id, last_updated_at").eq("platform", "apple").eq("serial_number", serial).eq("pass_type_identifier", passType).maybeSingle();
  if (!pass) return new Response(null, { status: 404 });
  const modified = new Date(Math.floor(+new Date(pass.last_updated_at) / 1000) * 1000);
  const ims = req.headers.get("if-modified-since");
  if (ims && !Number.isNaN(Date.parse(ims)) && modified <= new Date(ims)) return new Response(null, { status: 304 });
  try {
    const creds = await appleCredsFor(pass.merchant_id);
    if (!creds) return new Response(null, { status: 404 });
    const { pkpass } = await buildApplePass(pass.card_id, creds);
    return new Response(new Uint8Array(pkpass), { headers: { "Content-Type": "application/vnd.apple.pkpass", "Last-Modified": modified.toUTCString(), "Cache-Control": "no-store" } });
  } catch (e) {
    await db.from("system_logs").insert({ level: "error", source: "wallet.apple.ws", message: e instanceof Error ? e.message.slice(0, 500) : "unknown", context: { serial } });
    return new Response(null, { status: 500 });
  }
}
