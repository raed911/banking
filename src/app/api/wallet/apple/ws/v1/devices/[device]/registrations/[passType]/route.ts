import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * PassKit web service: which of this device's passes changed since `passesUpdatedSince`?
 * The update tag is the epoch (ms) of the latest change we report.
 */
export async function GET(req: Request, { params }: { params: Promise<{ device: string; passType: string }> }) {
  const { device, passType } = await params;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(device)) return new Response(null, { status: 400 });
  const since = Number(new URL(req.url).searchParams.get("passesUpdatedSince") ?? 0);
  const db = createAdminClient();
  const { data: regs } = await db.from("apple_device_registrations").select("pass_id").eq("device_library_identifier", device);
  if (!regs?.length) return new Response(null, { status: 404 });
  let q = db.from("wallet_passes").select("serial_number, last_updated_at").in("id", regs.map((r) => r.pass_id)).eq("pass_type_identifier", passType);
  // the tag is whole milliseconds while the database keeps microseconds: start at the next millisecond
  if (Number.isFinite(since) && since > 0) q = q.gte("last_updated_at", new Date(since + 1).toISOString());
  const { data: passes } = await q;
  if (!passes?.length) return new Response(null, { status: 204 });
  const lastUpdated = Math.max(...passes.map((p) => +new Date(p.last_updated_at)));
  return NextResponse.json({ serialNumbers: passes.map((p) => p.serial_number), lastUpdated: String(lastUpdated) });
}
