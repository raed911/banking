"use client";
import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Copy, Mail, MoreHorizontal, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { inviteMember, removeMember, revokeInvitation, updateMember } from "@/features/team/actions";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormAlert } from "@/components/forms/form-alert";

type Member = { member_id: string; user_id: string; email: string; full_name: string | null; role_id: string; role_key: string; role_name: string; status: string };
type Role = { id: string; key: string; name: string };
const sel = "h-10 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm";

export function TeamManager({ me, team, roles, invites }: { me: string; team: Member[]; roles: Role[]; invites: { id: string; email: string; role: string; expires: string }[] }) {
  const t = useTranslations("team");
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(inviteMember, null);
  const [pending, start] = useTransition();
  const assignable = roles.filter((r) => r.key !== "owner");
  const link = state?.ok ? String(state.data?.link) : null;
  return (
    <>
      <div className="flex justify-end"><Button onClick={() => setOpen(true)}><UserPlus />{t("invite")}</Button></div>
      <Card>
        <CardHeader><CardTitle>{t("members")}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {team.map((m) => {
            const name = m.full_name || m.email.split("@")[0]!;
            const locked = m.role_key === "owner" || m.user_id === me;
            return (
              <div key={m.member_id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border p-3">
                <Avatar name={name} size={40} />
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="truncate font-medium">{name}</span>{m.user_id === me && <Badge>{t("you")}</Badge>}{m.status === "disabled" && <Badge tone="danger">{t("disabled")}</Badge>}</div><div className="truncate text-xs text-fg-muted">{m.email}</div></div>
                {locked ? <Badge tone="ink">{m.role_name}</Badge> : (
                  <>
                    <select className={`${sel} w-40`} defaultValue={m.role_id} disabled={pending} onChange={(e) => start(async () => { await updateMember(m.member_id, { role_id: e.target.value }); })} aria-label={t("role")}>
                      {assignable.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Actions"><MoreHorizontal /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => start(async () => { await updateMember(m.member_id, { status: m.status === "active" ? "disabled" : "active" }); })}>{m.status === "active" ? t("disable") : t("enable")}</DropdownMenuItem>
                        <DropdownMenuItem danger onSelect={() => confirm(t("removeConfirm")) && start(async () => { await removeMember(m.member_id); })}>{t("remove")}</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
      {invites.length > 0 && (
        <Card>
          <CardHeader><CardTitle>{t("pending")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {invites.map((i) => (
              <div key={i.id} className="flex items-center gap-3 rounded-2xl bg-surface-muted p-3 text-sm">
                <Mail className="size-4 text-fg-muted" />
                <span className="min-w-0 flex-1"><span className="block truncate font-medium">{i.email}</span><span className="text-xs text-fg-muted">{i.role} · {t("expires", { date: i.expires })}</span></span>
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(() => revokeInvitation(i.id))}><X />{t("revoke")}</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={link ? t("linkTitle") : t("invite")}>
          {link ? (
            <div className="space-y-4">
              <p className="text-sm text-fg-muted">{t("linkDesc", { email: String(state?.data?.email) })}</p>
              <div className="break-all rounded-xl bg-surface-sunken p-3 font-mono text-xs" dir="ltr">{link}</div>
              <Button className="w-full" onClick={() => navigator.clipboard.writeText(link).then(() => toast.success(t("copied")))}><Copy />{t("copy")}</Button>
            </div>
          ) : (
            <form action={action} className="space-y-4">
              <FormAlert>{state?.error ? t(`errors.${state.error}` as "errors.generic") : null}</FormAlert>
              <Field label={t("email")} htmlFor="inv-email"><Input id="inv-email" name="email" type="email" required dir="ltr" /></Field>
              <Field label={t("role")} htmlFor="inv-role"><select id="inv-role" name="role_id" className={sel} defaultValue={assignable.find((r) => r.key === "cashier")?.id}>{assignable.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></Field>
              <div className="flex justify-end"><SubmitButton>{t("send")}</SubmitButton></div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
