"use client";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteLocation, saveLocation } from "@/features/settings/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormAlert } from "@/components/forms/form-alert";

type Loc = { id: string; name: string; address: string | null; city: string | null; phone: string | null; is_active: boolean };

function LocationForm({ loc, onDone }: { loc: Loc | null; onDone: () => void }) {
  const t = useTranslations("settings.locations");
  const [state, action] = useActionState(async (p: Awaited<ReturnType<typeof saveLocation>>, fd: FormData) => { const r = await saveLocation(loc?.id ?? null, p, fd); if (r?.ok) onDone(); return r; }, null);
  return (
    <form action={action} className="space-y-4">
      <FormAlert>{state?.error === "limit" ? <>{t("limit")} <Link href="/dashboard/billing" className="underline">→</Link></> : state?.error ? t("error") : null}</FormAlert>
      <Field label={t("name")} htmlFor="l-name"><Input id="l-name" name="name" required maxLength={80} defaultValue={loc?.name} /></Field>
      <Field label={t("address")} htmlFor="l-address"><Input id="l-address" name="address" maxLength={200} defaultValue={loc?.address ?? ""} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("city")} htmlFor="l-city"><Input id="l-city" name="city" maxLength={60} defaultValue={loc?.city ?? ""} /></Field>
        <Field label={t("phone")} htmlFor="l-phone"><Input id="l-phone" name="phone" type="tel" dir="ltr" defaultValue={loc?.phone ?? ""} /></Field>
      </div>
      <label className="flex items-center justify-between rounded-xl border border-border p-3 text-sm font-medium">{t("active")}<Switch name="is_active" defaultChecked={loc?.is_active ?? true} /></label>
      <div className="flex justify-end"><SubmitButton>{t("save")}</SubmitButton></div>
    </form>
  );
}

export function LocationsManager({ locations, canEdit }: { locations: Loc[]; canEdit: boolean }) {
  const t = useTranslations("settings.locations");
  const [editing, setEditing] = useState<Loc | "new" | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      {canEdit && <div className="flex justify-end"><Button onClick={() => setEditing("new")}><Plus />{t("add")}</Button></div>}
      <div className="grid gap-3 md:grid-cols-2">
        {locations.map((l) => (
          <div key={l.id} className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-ink-900 text-lime-300"><MapPin className="size-5" /></span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><span className="truncate font-semibold">{l.name}</span><Badge tone={l.is_active ? "success" : "neutral"} dot>{l.is_active ? t("active") : t("inactive")}</Badge></div>
              <div className="mt-1 text-sm text-fg-muted">{[l.address, l.city].filter(Boolean).join(", ") || "—"}</div>
              {l.phone && <div className="text-sm text-fg-muted" dir="ltr">{l.phone}</div>}
            </div>
            {canEdit && <div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => setEditing(l)} aria-label={t("edit")}><Pencil /></Button><Button variant="ghost" size="icon" disabled={pending} aria-label={t("delete")} onClick={() => confirm(t("deleteConfirm")) && start(() => deleteLocation(l.id))}><Trash2 /></Button></div>}
          </div>
        ))}
      </div>
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        {editing !== null && <DialogContent title={editing === "new" ? t("add") : t("edit")}><LocationForm loc={editing === "new" ? null : editing} onDone={() => setEditing(null)} /></DialogContent>}
      </Dialog>
    </>
  );
}
