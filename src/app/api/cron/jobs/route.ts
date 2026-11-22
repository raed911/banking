import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env.server";
import { runDueJobs } from "@/lib/jobs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: NextRequest) {
  const given = Buffer.from(req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "");
  const expected = Buffer.from(serverEnv().CRON_SECRET);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Invoked every minute by pg_cron + pg_net (only when jobs are due). */
export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const results = await runDueJobs();
  return NextResponse.json({ processed: results.length, failed: results.filter((r) => !r.ok).length });
}
