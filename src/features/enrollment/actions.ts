"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getLocale } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, rateLimit } from "@/lib/request";
import { normalizePhone } from "@/lib/phone";
import type { ActionState } from "@/lib/action";

const schema = z.object({
  first_name: z.string().trim().min(1).max(60),
  last_name: z.string().trim().max(60).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().max(254).optional().or(z.literal("")),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  website: z.string().max(0).optional().or(z.literal("")), // honeypot: must stay empty
});

export async function enroll(code: string, _: ActionState, form: FormData): Promise<ActionState> {
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "required" };
  const v = parsed.data;
  const ip = await clientIp();
  if (!(await rateLimit(`enroll:${ip}`, 6, 600)) || !(await rateLimit(`enroll-link:${code}`, 300, 3600))) return { error: "rate_limited" };

  const phone = v.phone ? normalizePhone(v.phone) : null;
  if (v.phone && !phone) return { error: "invalid_phone", fieldErrors: { phone: "invalid" } };
  const email = v.email ? v.email.toLowerCase() : null;
  if (email && !z.email().safeParse(email).success) return { error: "invalid_email", fieldErrors: { email: "invalid" } };

  const { data, error } = await createAdminClient().rpc("enroll_customer", {
    // the SQL function treats NULL as "not provided"
    p_link_code: code, p_first_name: v.first_name, p_last_name: (v.last_name || null) as string, p_phone: phone as string, p_email: email as string,
    p_birthday: v.birthday || undefined, p_marketing_consent: form.get("consent") === "on", p_locale: await getLocale(),
  });
  if (error) return { error: "generic" };
  const r = data as { ok: boolean; error?: string; card_token?: string };
  if (!r.ok) return { error: r.error ?? "generic" };
  redirect(`/c/${r.card_token}?welcome=1`);
}
