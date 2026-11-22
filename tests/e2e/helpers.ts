import { createClient } from "@supabase/supabase-js";

export function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SECRET_KEY!;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function createConfirmedUser(prefix = "e2e") {
  const email = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.vayro.app`;
  const password = "Vayro-test-2026";
  const { data, error } = await admin().auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: "E2E Tester" } });
  if (error) throw error;
  return { id: data.user.id, email, password };
}

export async function deleteUserAndMerchants(userId: string) {
  const db = admin();
  const { data } = await db.from("merchants").select("id").eq("created_by", userId);
  for (const m of data ?? []) await db.from("merchants").delete().eq("id", m.id);
  await db.auth.admin.deleteUser(userId);
}

import type { Page } from "@playwright/test";

/** Creates a confirmed user, signs in and creates a business. Returns the user for cleanup. */
export async function signInWithBusiness(page: Page, businessName = "Café E2E") {
  const user = await createConfirmedUser();
  await page.goto("/login");
  await page.locator("#email").fill(user.email);
  await page.locator("#password").fill(user.password);
  await page.locator("button[type=submit]").click();
  await page.waitForURL(/\/onboarding/);
  await page.waitForLoadState("load");
  await page.locator("#name").fill(businessName);
  await page.locator("form button[type=submit]").click();
  await page.waitForURL(/\/dashboard/);
  return user;
}

import { createHmac } from "node:crypto";

/** RFC 6238 TOTP (SHA-1, 30 s, 6 digits) — lets tests act like an authenticator app. */
export function totp(secretBase32: string, at = Date.now()) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of secretBase32.replace(/=+$/, "").toUpperCase()) bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 30000)));
  const h = createHmac("sha1", key).update(counter).digest();
  const o = h[h.length - 1]! & 0xf;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000)).padStart(6, "0");
}

/** Enrolls and verifies a TOTP factor for a user through the public Auth API; returns the secret. */
export async function enrollTotp(email: string, password: string) {
  const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  await c.auth.signInWithPassword({ email, password });
  const { data, error } = await c.auth.mfa.enroll({ factorType: "totp" });
  if (error) throw error;
  const v = await c.auth.mfa.challengeAndVerify({ factorId: data.id, code: totp(data.totp.secret) });
  if (v.error) throw v.error;
  return data.totp.secret;
}
