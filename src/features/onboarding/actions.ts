"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { fieldErrorsFrom, type ActionState } from "@/lib/action";
import { normalizePhone } from "@/lib/phone";
import { slugify } from "@/lib/utils";

import { INDUSTRIES } from "./constants";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  industry: z.enum(INDUSTRIES),
  city: z.string().trim().max(60).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});

export async function createMerchant(_: ActionState, form: FormData): Promise<ActionState> {
  await requireUser("/onboarding");
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "generic", fieldErrors: fieldErrorsFrom(parsed.error) };
  const phone = parsed.data.phone ? normalizePhone(parsed.data.phone) : null;
  if (parsed.data.phone && !phone) return { error: "invalid_phone", fieldErrors: { phone: "invalid" } };

  const supabase = await createClient();
  const base = slugify(parsed.data.name) || "commerce";
  let lastError = "generic";
  for (let attempt = 0; attempt < 4; attempt++) {
    const slug = attempt === 0 ? base : `${base.slice(0, 40)}-${Math.random().toString(36).slice(2, 6)}`;
    const { error } = await supabase.rpc("create_merchant", {
      p_name: parsed.data.name, p_slug: slug, p_industry: parsed.data.industry,
      p_phone: phone ?? undefined, p_city: parsed.data.city || undefined, p_locale: await getLocale(),
    });
    if (!error) redirect("/dashboard?welcome=1");
    lastError = error.message.includes("slug_taken") ? "slug_taken" : error.message.includes("merchant_limit_reached") ? "merchant_limit_reached" : "generic";
    if (lastError !== "slug_taken") break;
  }
  return { error: lastError };
}
