"use server";
import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMerchant, requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { PERMISSIONS } from "@/lib/permissions";
import type { ActionState } from "@/lib/action";

const hashToken = async (token: string) => createHash("sha256").update(token).digest("hex");

export async function inviteMember(_: ActionState, form: FormData): Promise<ActionState> {
  const { merchantId } = await requireMerchant("employees.manage");
  const parsed = z.object({ email: z.email().max(254), role_id: z.uuid() }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "generic" };
  const token = randomBytes(24).toString("base64url");
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_invitation", { p_merchant_id: merchantId, p_email: parsed.data.email.toLowerCase(), p_role_id: parsed.data.role_id, p_token_hash: await hashToken(token) });
  if (error) return { error: ["already_member", "invalid_role"].find((k) => error.message.includes(k)) ?? (error.code === "42501" ? "forbidden" : "generic") };
  revalidatePath("/dashboard/employees");
  return { ok: true, data: { link: `${publicEnv.NEXT_PUBLIC_APP_URL}/invite/${token}`, email: parsed.data.email } };
}

export async function revokeInvitation(id: string) {
  await requireMerchant("employees.manage");
  const supabase = await createClient();
  await supabase.from("invitations").update({ revoked_at: new Date().toISOString() }).eq("id", z.uuid().parse(id));
  revalidatePath("/dashboard/employees");
}

export async function updateMember(memberId: string, patch: { role_id?: string; status?: "active" | "disabled" }) {
  await requireMerchant("employees.manage");
  const supabase = await createClient();
  const update: { role_id?: string; status?: "active" | "disabled" } = {};
  if (patch.role_id) update.role_id = z.uuid().parse(patch.role_id);
  if (patch.status) update.status = z.enum(["active", "disabled"]).parse(patch.status);
  const { error } = await supabase.from("merchant_members").update(update).eq("id", z.uuid().parse(memberId));
  revalidatePath("/dashboard/employees");
  return { ok: !error };
}

export async function removeMember(memberId: string) {
  await requireMerchant("employees.manage");
  const supabase = await createClient();
  const { error } = await supabase.from("merchant_members").delete().eq("id", z.uuid().parse(memberId));
  revalidatePath("/dashboard/employees");
  return { ok: !error };
}

export async function acceptInvitation(token: string): Promise<{ error?: string }> {
  await requireUser(`/invite/${token}`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_invitation", { p_token_hash: await hashToken(token) });
  if (error) return { error: ["invitation_expired", "email_mismatch"].find((k) => error.message.includes(k))?.replace("invitation_", "") ?? "invalid" };
  revalidatePath("/dashboard", "layout");
  return {};
}

const permsSchema = z.array(z.enum(PERMISSIONS)).max(PERMISSIONS.length);

export async function saveRole(roleId: string | null, _: ActionState, form: FormData): Promise<ActionState> {
  const { merchantId } = await requireMerchant("roles.manage");
  const name = z.string().trim().min(2).max(40).safeParse(form.get("name"));
  const perms = permsSchema.safeParse(form.getAll("permissions"));
  if (!name.success || !perms.success) return { error: "error" };
  const supabase = await createClient();
  const description = String(form.get("description") ?? "").trim().slice(0, 200) || null;
  const { error } = roleId
    ? await supabase.from("roles").update({ name: name.data, description, permissions: perms.data }).eq("id", z.uuid().parse(roleId))
    : await supabase.from("roles").insert({ merchant_id: merchantId, key: `custom_${Date.now().toString(36)}`, name: name.data, description, permissions: perms.data });
  if (error) return { error: "error" };
  revalidatePath("/dashboard/roles");
  return { ok: true };
}

export async function deleteRole(roleId: string) {
  await requireMerchant("roles.manage");
  const supabase = await createClient();
  const { error } = await supabase.from("roles").delete().eq("id", z.uuid().parse(roleId));
  revalidatePath("/dashboard/roles");
  return { ok: !error };
}
