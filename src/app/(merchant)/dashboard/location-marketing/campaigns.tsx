"use client";
import { ActionForm } from "@/components/forms/action-form";
import { useActionState, useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { CalendarClock, MapPin, Pause, Pencil, Play, Plus, Radar, Square, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { deleteLocationCampaign, saveLocationCampaign, setLocationCampaignStatus } from "@/features/geo/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/states";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormAlert } from "@/components/forms/form-alert";
import { cn } from "@/lib/utils";

export type Campaign = { id: string; name: string; message: string; location_ids: string[]; program_ids: string[] | null; starts_at: string; ends_at: string; status: "draft" | "scheduled" | "active" | "paused" | "ended"; coupon_id: string | null;
  stats: { visits: number; visits_before: number; customers: number; coupon_redemptions: number; passes_reached: number } | null };
type Opt = { id: string; name: string };
const TONE = { draft: "neutral", scheduled: "info", active: "success", paused: "warning", ended: "neutral" } as const;
const local = (iso?: string) => { const d = iso ? new Date(iso) : new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };

function CampaignForm({ c, locations, programs, coupons, onDone }: { c: Campaign | null; locations: Opt[]; programs: Opt[]; coupons: Opt[]; onDone: () => void }) {
  const t = useTranslations("geo.campaign");
  const [message, setMessage] = useState(c?.message ?? "");
  const [defaults] = useState(() => ({ start: local(c?.starts_at), end: local(c?.ends_at ?? new Date(Date.now() + 3 * 3600_000).toISOString()) }));
  const [state, action] = useActionState(async (p: Awaited<ReturnType<typeof saveLocationCampaign>>, fd: FormData) => { const r = await saveLocationCampaign(c?.id ?? null, p, fd); if (r?.ok) onDone(); return r; }, null);
  const toIso = (e: React.FormEvent<HTMLFormElement>) => {
    const f = e.currentTarget;
    for (const n of ["starts_at", "ends_at"]) { const el = f.elements.namedItem(`${n}_local`) as HTMLInputElement; (f.elements.namedItem(n) as HTMLInputElement).value = new Date(el.value).toISOString(); }
  };
  return (
    <ActionForm action={action} onSubmit={toIso} className="space-y-4">
      <FormAlert>{state?.error ? t(`errors.${state.error}` as "errors.generic") : null}</FormAlert>
      <Field label={t("name")} htmlFor="lc-name"><Input id="lc-name" name="name" required maxLength={80} defaultValue={c?.name} placeholder={t("namePlaceholder")} /></Field>
      <Field label={t("message")} htmlFor="lc-msg" hint={`${message.length}/120`}><Input id="lc-msg" name="message" required minLength={3} maxLength={120} value={message} onChange={(e) => setMessage(e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("starts")} htmlFor="lc-s"><Input id="lc-s" name="starts_at_local" type="datetime-local" required defaultValue={defaults.start} /></Field>
        <Field label={t("ends")} htmlFor="lc-e"><Input id="lc-e" name="ends_at_local" type="datetime-local" required defaultValue={defaults.end} /></Field>
      </div>
      <input type="hidden" name="starts_at" /><input type="hidden" name="ends_at" />
      <fieldset><legend className="mb-2 text-[13px] font-medium">{t("locations")}</legend>
        <div className="flex flex-wrap gap-2">{locations.map((l) => <label key={l.id} className="flex cursor-pointer items-center gap-2 rounded-xl border border-border-strong px-3 py-2 text-sm has-[:checked]:border-ink-900 has-[:checked]:bg-ink-900 has-[:checked]:text-white"><input type="checkbox" name="location_ids" value={l.id} defaultChecked={c ? c.location_ids.includes(l.id) : locations.length === 1} className="sr-only" /><MapPin className="size-3.5" />{l.name}</label>)}</div>
      </fieldset>
      {programs.length > 1 && <fieldset><legend className="mb-2 text-[13px] font-medium">{t("programs")} <span className="font-normal text-fg-muted">({t("allPrograms")} ∅)</span></legend>
        <div className="flex flex-wrap gap-2">{programs.map((p) => <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-xl border border-border-strong px-3 py-2 text-sm has-[:checked]:border-ink-900 has-[:checked]:bg-lime-100"><input type="checkbox" name="program_ids" value={p.id} defaultChecked={c?.program_ids?.includes(p.id)} className="size-3.5 accent-ink-900" />{p.name}</label>)}</div>
      </fieldset>}
      <Field label={t("coupon")} htmlFor="lc-coupon"><select id="lc-coupon" name="coupon_id" defaultValue={c?.coupon_id ?? ""} className="h-10 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm"><option value="">{t("noCoupon")}</option>{coupons.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
      <div className="flex justify-end gap-2"><SubmitButton name="intent" value="draft" variant="secondary">{t("saveDraft")}</SubmitButton><SubmitButton name="intent" value="schedule" variant="accent"><CalendarClock />{t("schedule")}</SubmitButton></div>
    </ActionForm>
  );
}

export function LocationCampaigns({ campaigns, locations, programs, coupons, canEdit }: { campaigns: Campaign[]; locations: Opt[]; programs: Opt[]; coupons: Opt[]; canEdit: boolean }) {
  const t = useTranslations("geo.campaign");
  const format = useFormatter();
  const [editing, setEditing] = useState<Campaign | "new" | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-4">
      {canEdit && <div className="flex justify-end"><Button onClick={() => setEditing("new")} disabled={!locations.length}><Plus />{t("new")}</Button></div>}
      {!campaigns.length ? <EmptyState icon={<Radar />} title={t("new")} description={t("empty")} /> : campaigns.map((c) => {
        const s = c.stats;
        const uplift = s && s.visits_before > 0 ? Math.round(((s.visits - s.visits_before) / s.visits_before) * 100) : null;
        return (
          <Card key={c.id} className="overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3 p-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2"><h3 className="truncate font-semibold">{c.name}</h3><Badge tone={TONE[c.status]} dot>{t(`statuses.${c.status}`)}</Badge></div>
                <p className="mt-1 text-sm text-fg-muted">“{c.message}”</p>
                <p className="mt-1 text-xs text-fg-subtle">{format.dateTimeRange(new Date(c.starts_at), new Date(c.ends_at), { dateStyle: "medium", timeStyle: "short" })} · {c.location_ids.map((id) => locations.find((l) => l.id === id)?.name).filter(Boolean).join(", ")}</p>
              </div>
              {canEdit && <div className="flex gap-1">
                {c.status !== "ended" && <Button size="sm" variant="ghost" onClick={() => setEditing(c)} aria-label={t("edit")}><Pencil /></Button>}
                {(c.status === "active" || c.status === "scheduled") && <Button size="sm" variant="secondary" disabled={pending} onClick={() => start(() => setLocationCampaignStatus(c.id, "paused"))}><Pause />{t("pause")}</Button>}
                {c.status === "paused" && <Button size="sm" variant="secondary" disabled={pending} onClick={() => start(() => setLocationCampaignStatus(c.id, "active"))}><Play />{t("resume")}</Button>}
                {c.status !== "ended" && c.status !== "draft" && <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(() => setLocationCampaignStatus(c.id, "ended"))}><Square />{t("end")}</Button>}
                {(c.status === "draft" || c.status === "ended") && <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(() => deleteLocationCampaign(c.id))} aria-label={t("delete")}><Trash2 /></Button>}
              </div>}
            </div>
            {s && c.status !== "draft" && (
              <div className="grid grid-cols-2 gap-px border-t border-border bg-border sm:grid-cols-5">
                {[
                  [t("stats.visits"), s.visits], [t("stats.before"), s.visits_before],
                  [t("stats.uplift"), uplift == null ? "—" : <span key="u" className={cn("inline-flex items-center gap-1", uplift >= 0 ? "text-success-700" : "text-danger-700")}>{uplift >= 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}{uplift}%</span>],
                  [t("stats.customers"), s.customers], [c.coupon_id ? t("stats.coupons") : t("stats.passes"), c.coupon_id ? s.coupon_redemptions : s.passes_reached],
                ].map(([k, v]) => <div key={String(k)} className="bg-surface p-4"><div className="text-xs text-fg-muted">{k}</div><div className="tabular mt-1 text-xl font-semibold">{v}</div></div>)}
              </div>
            )}
          </Card>
        );
      })}
      <p className="text-xs text-fg-muted">{t("statsNote")}</p>
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        {editing !== null && <DialogContent title={editing === "new" ? t("new") : t("edit")} className="sm:max-w-xl"><CampaignForm c={editing === "new" ? null : editing} locations={locations} programs={programs} coupons={coupons} onDone={() => setEditing(null)} /></DialogContent>}
      </Dialog>
    </div>
  );
}
