import { clientIp, rateLimit } from "@/lib/request";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** PassKit web service: devices report pass problems here (kept short, rate-limited). */
export async function POST(req: Request) {
  if (!(await rateLimit(`alog:${await clientIp()}`, 30, 3600))) return new Response(null, { status: 200 });
  const body = (await req.json().catch(() => null)) as { logs?: unknown } | null;
  const logs = Array.isArray(body?.logs) ? body.logs.slice(0, 10).map((l) => String(l).slice(0, 300)) : [];
  if (logs.length) await createAdminClient().from("system_logs").insert({ level: "warn", source: "wallet.apple.device", message: logs[0]!, context: { logs } });
  return new Response(null, { status: 200 });
}
