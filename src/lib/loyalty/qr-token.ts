import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env.server";

/**
 * Rotating card QR codes.
 *   dynamic  — "VY1.<cardId>.<expEpochSec>.<sig>"  shown on the customer's card page, valid ~90 s
 *   static   — "VYS.<serial>"                      printed in Wallet passes; only usable by signed-in staff
 * The signature is HMAC-SHA256 (truncated to 128 bits, base64url) over "VY1.<cardId>.<exp>".
 */
const TTL_SECONDS = 90;

function sign(data: string, secret = serverEnv().QR_SIGNING_SECRET) {
  return createHmac("sha256", secret).update(data).digest().subarray(0, 16).toString("base64url");
}

export function createCardQrToken(cardId: string, now = Date.now(), secret?: string) {
  const exp = Math.floor(now / 1000) + TTL_SECONDS;
  const body = `VY1.${cardId}.${exp}`;
  return { token: `${body}.${sign(body, secret)}`, expiresAt: exp * 1000 };
}

export type ParsedQr = { kind: "dynamic"; cardId: string } | { kind: "static"; serial: string } | { kind: "invalid"; reason: "format" | "signature" | "expired" };

export function parseCardQr(raw: string, now = Date.now(), secret?: string): ParsedQr {
  const value = raw.trim();
  const stat = /^VYS\.([A-Z2-9]{10})$/.exec(value);
  if (stat) return { kind: "static", serial: stat[1]! };
  const m = /^VY1\.([0-9a-f-]{36})\.(\d{9,11})\.([A-Za-z0-9_-]{22})$/.exec(value);
  if (!m) return { kind: "invalid", reason: "format" };
  const [, cardId, exp, sig] = m as unknown as [string, string, string, string];
  const expected = Buffer.from(sign(`VY1.${cardId}.${exp}`, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { kind: "invalid", reason: "signature" };
  if (Number(exp) * 1000 < now) return { kind: "invalid", reason: "expired" };
  return { kind: "dynamic", cardId };
}
