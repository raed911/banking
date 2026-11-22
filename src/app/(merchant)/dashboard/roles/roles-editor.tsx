"use client";
import { ActionForm } from "@/components/forms/action-form";
import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Lock, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteRole, saveRole } from "@/features/team/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormAlert } from "@/components/forms/form-alert";
import { PERMISSION_GROUPS } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type Role = { id: string; key: string; name: string; description: string | null; permissions: string[]; is_system: boolean };

export function RolesEditor({ roles, usage }: { roles: Role[]; usage: Record<string, number> }) {
  const t = useTranslations("roles");
  const [selectedId, setSelectedId] = useState<string | "new">(roles.find((r) => r.key !== "owner")?.id ?? "new");
  const role = selectedId === "new" ? null : roles.find((r) => r.id === selectedId) ?? null;
  const [pending, start] = useTransition();
  const [state, action] = useActionState(async (p: Awaited<ReturnType<typeof saveRole>>, fd: FormData) => { const r = await saveRole(role?.id ?? null, p, fd); if (r?.ok) toast.success(t("saved")); return r; }, null);
  const owner = role?.key === "owner";
  return (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className="space-y-2">
        {roles.map((r) => (
          <button key={r.id} onClick={() => setSelectedId(r.id)} className={cn("flex w-full items-center gap-3 rounded-2xl border p-3 text-start transition", selectedId === r.id ? "border-ink-900 bg-ink-900 text-white" : "border-border bg-surface hover:border-ink-300")}>
            <span className={cn("grid size-9 place-items-center rounded-xl", selectedId === r.id ? "bg-lime-300 text-ink-900" : "bg-surface-sunken")}>{r.key === "owner" ? <Lock className="size-4" /> : <ShieldCheck className="size-4" />}</span>
            <span className="min-w-0 flex-1"><span className="block truncate font-medium">{r.name}</span><span className={cn("text-xs", selectedId === r.id ? "text-ink-300" : "text-fg-muted")}>{usage[r.id] ?? 0} · {r.is_system ? t("system") : r.key.startsWith("custom") ? "" : ""}</span></span>
          </button>
        ))}
        <Button variant="secondary" className="w-full" onClick={() => setSelectedId("new")}><Plus />{t("new")}</Button>
      </div>
      <Card>
        <CardContent>
          {owner ? <p className="flex items-center gap-2 text-sm text-fg-muted"><Lock className="size-4" />{t("owner")}</p> : (
            <ActionForm action={action} key={selectedId} className="space-y-6">
              <FormAlert>{state?.error ? t("error") : null}</FormAlert>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("name")} htmlFor="r-name"><Input id="r-name" name="name" required minLength={2} maxLength={40} defaultValue={role?.name} /></Field>
                <Field label={t("description")} htmlFor="r-desc"><Input id="r-desc" name="description" maxLength={200} defaultValue={role?.description ?? ""} /></Field>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {PERMISSION_GROUPS.map((g) => (
                  <fieldset key={g.key} className="rounded-2xl border border-border p-4">
                    <legend className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">{t(`groups.${g.key}`)}</legend>
                    <div className="space-y-2.5">
                      {g.permissions.map((p) => (
                        <label key={p} className="flex items-center gap-3 text-sm"><input type="checkbox" name="permissions" value={p} defaultChecked={role?.permissions.includes(p) || role?.permissions.includes("*")} className="size-4 accent-ink-900" />{t(`perms.${p.replace(".", "_")}` as "perms.dashboard_view")}</label>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
              <div className="flex items-center justify-between">
                {role && !role.is_system ? <Button type="button" variant="ghost" disabled={pending || (usage[role.id] ?? 0) > 0} title={(usage[role.id] ?? 0) > 0 ? t("inUse") : undefined} onClick={() => confirm(t("deleteConfirm")) && start(async () => { await deleteRole(role.id); setSelectedId("new"); })}><Trash2 />{t("delete")}</Button> : <span>{role?.is_system && <Badge>{t("system")}</Badge>}</span>}
                <SubmitButton>{t("save")}</SubmitButton>
              </div>
            </ActionForm>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
