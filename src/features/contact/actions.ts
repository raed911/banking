"use server";
import { z } from "zod";
import { getLocale } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, rateLimit } from "@/lib/request";
import type { ActionState } from "@/lib/action";

export async function sendContact(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = z.object({
    name: z.string().trim().min(2).max(80), email: z.email().max(254), phone: z.string().trim().max(30).optional().or(z.literal("")),
    business: z.string().trim().max(120).optional().or(z.literal("")), message: z.string().trim().min(5).max(3000), website: z.string().max(0).optional().or(z.literal("")),
  }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "error" };
  if (!(await rateLimit(`contact:${await clientIp()}`, 3, 3600))) return { error: "rate" };
  const v = parsed.data;
  const { error } = await createAdminClient().from("contact_messages").insert({ name: v.name, email: v.email.toLowerCase(), phone: v.phone || null, business: v.business || null, message: v.message, locale: await getLocale() });
  return error ? { error: "error" } : { ok: true };
}
