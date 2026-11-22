import { NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/** CSV export of the merchant's customers (RLS + customers.export permission). */
export async function GET() {
  const { merchantId, membership } = await requireMerchant("customers.export");
  const supabase = await createClient();
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase.from("customers").select("first_name, last_name, phone, email, birthday, marketing_consent, total_visits, last_visit_at, created_at, tags").eq("merchant_id", merchantId).is("deleted_at", null).order("created_at").range(from, from + 999);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  const cols = ["first_name", "last_name", "phone", "email", "birthday", "marketing_consent", "total_visits", "last_visit_at", "created_at", "tags"];
  const esc = (v: unknown) => {
    let s = Array.isArray(v) ? v.join("|") : v == null ? "" : String(v);
    if (/^[=+\-@]/.test(s)) s = `'${s}`; // prevent CSV formula injection
    return `"${s.replaceAll('"', '""')}"`;
  };
  const csv = "﻿" + [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\r\n");
  const name = membership.merchant.slug.replace(/[^a-z0-9-]/g, "");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="vayro-${name}-clients.csv"`, "Cache-Control": "no-store" } });
}
