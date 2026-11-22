"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { setLocale } from "@/i18n/actions";
import { normalizePhone } from "@/lib/phone";
import type { ActionState } from "@/lib/action";

export async function saveProfile(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/account");
  const parsed = z.object({ full_name: z.string().trim().min(2).max(80), phone: z.string().trim().max(30).optional().or(z.literal("")), locale: z.enum(["fr", "ar", "en"]) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "generic" };
  const phone = parsed.data.phone ? normalizePhone(parsed.data.phone) : null;
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ full_name: parsed.data.full_name, phone, locale: parsed.data.locale }).eq("id", user.id);
  if (error) return { error: "generic" };
  await setLocale(parsed.data.locale);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function changePassword(_: ActionState, form: FormData): Promise<ActionState> {
  await requireUser("/account");
  const parsed = z.string().min(8).max(72).regex(/[A-Za-z]/).regex(/[0-9]/).safeParse(form.get("password"));
  if (!parsed.success) return { error: "weak_password" };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) return { error: error.code === "reauthentication_needed" || error.code === "insufficient_aal" ? "reauth" : error.code === "weak_password" ? "weak_password" : "generic" };
  return { ok: true };
}
