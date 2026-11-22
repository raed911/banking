"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicEnv } from "@/lib/env";
import { safeNext, type ActionState } from "@/lib/action";
import { getLocale } from "next-intl/server";

const KNOWN = new Set(["invalid_credentials", "email_not_confirmed", "user_already_exists", "weak_password", "over_email_send_rate_limit", "email_address_invalid"]);
function mapAuthError(code?: string) {
  if (!code) return "generic";
  if (code === "email_address_invalid") return "invalid_email";
  if (code.includes("rate_limit") && code !== "over_email_send_rate_limit") return "rate_limited";
  return KNOWN.has(code) ? code : "generic";
}

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

async function allow(action: string, max: number, windowSeconds: number, subject = "") {
  try {
    const key = `${action}:${await clientIp()}${subject ? `:${subject}` : ""}`;
    const { data } = await createAdminClient().rpc("check_rate_limit", { p_key: key, p_max: max, p_window_seconds: windowSeconds });
    return data !== false;
  } catch {
    return true; // never lock users out because the limiter is unavailable; Supabase Auth has its own limits
  }
}

const email = z.email().max(254).transform((v) => v.toLowerCase().trim());
const password = z.string().min(8).max(72).regex(/[A-Za-z]/).regex(/[0-9]/);

export async function signIn(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = z.object({ email, password: z.string().min(1).max(72) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "invalid_credentials" };
  // per account+IP (brute force) and per IP (credential stuffing); shops often share one IP
  if (!(await allow("login", 8, 300, parsed.data.email)) || !(await allow("login-ip", 60, 300))) return { error: "rate_limited" };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: mapAuthError(error.code) };
  redirect(safeNext(form.get("next")));
}

export async function signUp(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = z.object({ fullName: z.string().trim().min(2).max(80), email, password }).safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return { error: field === "password" ? "weak_password" : field === "email" ? "invalid_email" : "required", fieldErrors: { [String(field)]: "1" } };
  }
  if (!(await allow("signup", 20, 3600))) return { error: "rate_limited" };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${publicEnv.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/onboarding`,
      data: { full_name: parsed.data.fullName, locale: await getLocale() },
    },
  });
  if (error) return { error: mapAuthError(error.code) };
  // Supabase returns a user with no identities when the email is already registered (anti-enumeration)
  if (data.user && data.user.identities?.length === 0) return { ok: true, data: { email: parsed.data.email } };
  if (data.session) redirect("/onboarding");
  return { ok: true, data: { email: parsed.data.email } };
}

export async function requestPasswordReset(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = z.object({ email }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "invalid_email" };
  if (!(await allow("reset", 5, 3600))) return { error: "rate_limited" };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${publicEnv.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/reset-password` });
  return { ok: true }; // same answer whether or not the account exists
}

export async function updatePassword(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = z.object({ password }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "weak_password" };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: mapAuthError(error.code) };
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
