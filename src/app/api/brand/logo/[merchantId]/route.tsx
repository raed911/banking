import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 3600;

/** Square PNG logo for Wallet passes: the merchant's uploaded logo if any, else a branded monogram. */
export async function GET(_: Request, { params }: { params: Promise<{ merchantId: string }> }) {
  const { merchantId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(merchantId)) return new Response("Not found", { status: 404 });
  const { data: m } = await createAdminClient().from("merchants").select("name, logo_path, brand_color").eq("id", merchantId).maybeSingle();
  if (!m) return new Response("Not found", { status: 404 });
  if (m.logo_path) return Response.redirect(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/brand-assets/${m.logo_path}`, 302);
  const bg = m.brand_color === "#101828" ? "#C6F36B" : m.brand_color;
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: bg, color: "#101828", fontSize: 360, fontWeight: 800 }}>{m.name.slice(0, 1).toUpperCase()}</div>,
    { width: 660, height: 660 },
  );
}
