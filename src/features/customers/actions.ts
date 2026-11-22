"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireMerchant } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/phone";
import type { ActionState } from "@/lib/action";

const schema = z.object({
  first_name: z.string().trim().min(1).max(60),
  last_name: z.string().trim().max(60).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().max(254).optional().or(z.literal("")),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  tags: z.string().max(300).optional().or(z.literal("")),
  program_id: z.uuid().optional().or(z.literal("")),
});

function clean(form: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "generic" as const };
  const v = parsed.data;
  const phone = v.phone ? normalizePhone(v.phone) : null;
  if (v.phone && !phone) return { error: "invalid_phone" as const };
  const email = v.email ? v.email.toLowerCase() : null;
  if (email && !z.email().safeParse(email).success) return { error: "generic" as const };
  if (!phone && !email) return { error: "identifier" as const };
  const consent = form.get("marketing_consent") === "on";
  return {
    values: {
      first_name: v.first_name, last_name: v.last_name || null, phone, email, birthday: v.birthday || null, notes: v.notes || null,
      tags: (v.tags ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20), marketing_consent: consent,
    },
    programId: v.program_id || null,
  };
}

export async function createCustomer(_: ActionState, form: FormData): Promise<ActionState> {
  const { merchantId } = await requireMerchant("customers.manage");
  const c = clean(form);
  if ("error" in c) return { error: c.error };
  const supabase = await createClient();
  const { data, error } = await supabase.from("customers").insert({ ...c.values, merchant_id: merchantId, source: "dashboard", consent_at: c.values.marketing_consent ? new Date().toISOString() : null }).select("id").single();
  if (error) return { error: error.code === "23505" ? "duplicate" : error.code === "42501" ? "forbidden" : "generic" };
  if (c.programId) await supabase.from("loyalty_cards").insert({ merchant_id: merchantId, program_id: c.programId, customer_id: data.id });
  revalidatePath("/dashboard/customers");
  redirect(`/dashboard/customers/${data.id}`);
}

export async function updateCustomer(customerId: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireMerchant("customers.manage");
  const c = clean(form);
  if ("error" in c) return { error: c.error };
  const supabase = await createClient();
  const { error } = await supabase.from("customers").update(c.values).eq("id", z.uuid().parse(customerId));
  if (error) return { error: error.code === "23505" ? "duplicate" : "generic" };
  revalidatePath(`/dashboard/customers/${customerId}`);
  return { ok: true };
}

export async function issueCard(customerId: string, programId: string): Promise<ActionState> {
  const { merchantId } = await requireMerchant("customers.manage");
  const supabase = await createClient();
  const { error } = await supabase.from("loyalty_cards").insert({ merchant_id: merchantId, program_id: z.uuid().parse(programId), customer_id: z.uuid().parse(customerId) });
  if (error) return { error: error.code === "23505" ? "already_has_card" : "generic" };
  revalidatePath(`/dashboard/customers/${customerId}`);
  return { ok: true };
}

export async function setCardStatus(customerId: string, cardId: string, status: "active" | "blocked") {
  await requireMerchant("cards.adjust");
  const supabase = await createClient();
  await supabase.from("loyalty_cards").update({ status }).eq("id", z.uuid().parse(cardId));
  revalidatePath(`/dashboard/customers/${customerId}`);
}

export async function deleteCustomer(customerId: string) {
  await requireMerchant("customers.manage");
  const supabase = await createClient();
  const id = z.uuid().parse(customerId);
  await supabase.from("customers").update({ deleted_at: new Date().toISOString(), phone: null, email: null }).eq("id", id);
  await supabase.from("loyalty_cards").update({ status: "archived" }).eq("customer_id", id);
  revalidatePath("/dashboard/customers");
  redirect("/dashboard/customers");
}
