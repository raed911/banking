import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAppleAuth } from "@/lib/wallet/apple-sync";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ device: string; passType: string; serial: string }> };

const DEVICE = /^[A-Za-z0-9_-]{1,128}$/;

async function findPass(passType: string, serial: string) {
  const { data } = await createAdminClient().from("wallet_passes").select("id, installed_at").eq("platform", "apple").eq("serial_number", serial).eq("pass_type_identifier", passType).maybeSingle();
  return data;
}

/** PassKit web service: a device registers to receive updates for a pass. */
export async function POST(req: Request, { params }: P) {
  const { device, passType, serial } = await params;
  if (!DEVICE.test(device) || !checkAppleAuth(req.headers.get("authorization"), serial)) return new Response(null, { status: 401 });
  const pass = await findPass(passType, serial);
  if (!pass) return new Response(null, { status: 401 });
  const body = z.object({ pushToken: z.string().regex(/^[A-Za-z0-9]{16,200}$/) }).safeParse(await req.json().catch(() => null));
  if (!body.success) return new Response(null, { status: 400 });
  const db = createAdminClient();
  const { data: existing } = await db.from("apple_device_registrations").select("id").eq("pass_id", pass.id).eq("device_library_identifier", device).maybeSingle();
  if (existing) await db.from("apple_device_registrations").update({ push_token: body.data.pushToken }).eq("id", existing.id);
  else await db.from("apple_device_registrations").insert({ pass_id: pass.id, device_library_identifier: device, push_token: body.data.pushToken });
  await db.from("wallet_passes").update({ removed_at: null, ...(pass.installed_at ? {} : { installed_at: new Date().toISOString() }) }).eq("id", pass.id);
  return new Response(null, { status: existing ? 200 : 201 });
}

/** PassKit web service: the pass was removed from that device. */
export async function DELETE(req: Request, { params }: P) {
  const { device, passType, serial } = await params;
  if (!DEVICE.test(device) || !checkAppleAuth(req.headers.get("authorization"), serial)) return new Response(null, { status: 401 });
  const pass = await findPass(passType, serial);
  if (!pass) return new Response(null, { status: 401 });
  const db = createAdminClient();
  await db.from("apple_device_registrations").delete().eq("pass_id", pass.id).eq("device_library_identifier", device);
  const { count } = await db.from("apple_device_registrations").select("id", { count: "exact", head: true }).eq("pass_id", pass.id);
  if (!count) await db.from("wallet_passes").update({ removed_at: new Date().toISOString() }).eq("id", pass.id);
  return new Response(null, { status: 200 });
}
