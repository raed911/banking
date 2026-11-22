"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getMemberships, requireUser } from "@/lib/auth/session";

export async function switchWorkspace(merchantId: string) {
  const user = await requireUser();
  const id = z.uuid().parse(merchantId);
  if (!(await getMemberships()).some((m) => m.merchant.id === id)) return;
  const supabase = await createClient();
  await supabase.from("profiles").update({ last_merchant_id: id }).eq("id", user.id);
  revalidatePath("/dashboard", "layout");
}
