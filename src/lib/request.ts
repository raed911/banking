import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Fixed-window rate limit backed by Postgres. Fails open if the limiter itself is unavailable. */
export async function rateLimit(key: string, max: number, windowSeconds: number) {
  try {
    const { data } = await createAdminClient().rpc("check_rate_limit", { p_key: key, p_max: max, p_window_seconds: windowSeconds });
    return data !== false;
  } catch {
    return true;
  }
}
