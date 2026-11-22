"use client";
import { ActionForm } from "@/components/forms/action-form";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Ban, Clock, Mail, Megaphone, Pencil, Plus, Send, Trash2, Users, Wallet } from "lucide-react";
import { audienceCount, cancelCampaign, deleteCampaign, saveCampaign, type Segment } from "@/features/campaigns/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/states";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormAlert } from "@/components/forms/form-alert";
import { cn } from "@/lib/utils";

export type CampaignRow = { id: string; name: string; channel: "email" | "wallet"; status: "draft" | "scheduled" | "sending" | "sent" | "canceled" | "failed"; segment: Segment; subject: string | null; content: { body?: string }; coupon_id: string | null; scheduled_at: string | null; stats: { targeted?: number; sent?: number; failed?: number }; created_at: string };
type Opt = { id: string; name: string };
const TONE = { draft: "neutral", scheduled: "info", sending: "warning", sent: "success", canceled: "neutral", failed: "danger" } as const;
const sel = "h-10 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm";

function CampaignForm({ c, programs, coupons, tags, connected, onDone }: { c: CampaignRow | null; programs: Opt[]; coupons: Opt[]; tags: string[]; connected: { email: boolean; wallet: boolean }; onDone: () => void }) {
  const t = useTranslations("camp");
  const [channel, setChannel] = useState<"email" | "wallet">(c?.channel ?? "email");
  const [segment, setSegment] = useState<Segment>(c?.segment ?? { type: "inactive", days: 30 });
  const [later, setLater] = useState(!!c?.scheduled_at);
  const [aud, setAud] = useState<{ eligible: number; segment_total: number; without_consent: number } | null>(null);
  const [state, action] = useActionState(async (p: Awaited<ReturnType<typeof saveCampaign>>, fd: FormData) => { const r = await saveCampaign(c?.id ?? null, p, fd); if (r?.ok) onDone(); return r; }, null);
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => { audienceCount(segment, channel).then((r) => alive && setAud(r)).catch(() => {}); }, 250);
    return () => { alive = false; clearTimeout(timer); };
  }, [segment, channel]);
  const needsDays = ["inactive", "active", "new"].includes(segment.type);
  return (
    <ActionForm action={action} className="space-y-4">
      <FormAlert>{state?.error ? t(`errors.${state.error}` as "errors.generic") : null}</FormAlert>
      <Field label={t("name")} htmlFor="cp-name"><Input id="cp-name" name="name" required maxLength={120} defaultValue={c?.name} placeholder={t("namePlaceholder")} /></Field>
      <fieldset><legend className="mb-2 text-[13px] font-medium">{t("channel")}</legend>
        <input type="hidden" name="channel" value={channel} />
        <div className="grid grid-cols-2 gap-2">
          {(["email", "wallet"] as const).map((ch) => (
            <button type="button" key={ch} onClick={() => setChannel(ch)} className={cn("flex items-center gap-3 rounded-xl border p-3 text-start text-sm", channel === ch ? "border-ink-900 bg-ink-900 text-white" : "border-border-strong")}>
              {ch === "email" ? <Mail className="size-4" /> : <Wallet className="size-4" />}<span className="flex-1 font-medium">{t(`channels.${ch}`)}</span>
              {!connected[ch] && <Clock className="size-3.5 text-warning-500" />}
            </button>
          ))}
        </div>
        {!connected[channel] && <p className="mt-2 rounded-lg bg-warning-50 p-2.5 text-xs text-warning-700">{t("channelPending")} — {t("channelPendingDesc")}</p>}
      </fieldset>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Field label={t("segment")} htmlFor="cp-seg"><select id="cp-seg" name="segment_type" className={sel} value={segment.type} onChange={(e) => setSegment({ type: e.target.value as Segment["type"], days: 30 })}>{(["all", "inactive", "active", "new", "birthday_month", "tag", "program"] as const).map((s) => <option key={s} value={s}>{t(`segments.${s}`)}</option>)}</select></Field>
        {needsDays && <Field label={t("days")} htmlFor="cp-days" className="w-24"><Input id="cp-days" name="segment_days" type="number" min={1} max={730} value={segment.days ?? 30} onChange={(e) => setSegment({ ...segment, days: Number(e.target.value) || 1 })} /></Field>}
        {segment.type === "tag" && <Field label={t("tag")} htmlFor="cp-tag" className="w-40"><select id="cp-tag" name="segment_tag" className={sel} value={segment.tag ?? ""} onChange={(e) => setSegment({ ...segment, tag: e.target.value })}><option value="" />{tags.map((x) => <option key={x}>{x}</option>)}</select></Field>}
        {segment.type === "program" && <Field label={t("program")} htmlFor="cp-prog" className="w-44"><select id="cp-prog" name="segment_program" className={sel} value={segment.program_id ?? ""} onChange={(e) => setSegment({ ...segment, program_id: e.target.value })}><option value="" />{programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>}
      </div>
      {aud && <div className="flex items-center gap-3 rounded-xl bg-lime-50 p-3 text-sm"><Users className="size-5 text-lime-700" /><div><div className="font-semibold">{t("audience", { eligible: aud.eligible })}</div><div className="text-xs text-fg-muted">{t("audienceDetail", { total: aud.segment_total, noConsent: aud.without_consent })}</div></div></div>}
      {channel === "email" && <Field label={t("subject")} htmlFor="cp-subj"><Input id="cp-subj" name="subject" required maxLength={150} defaultValue={c?.subject ?? ""} /></Field>}
      <Field label={t("body")} htmlFor="cp-body" hint={t("variables")}><Textarea id="cp-body" name="body" required minLength={3} maxLength={channel === "wallet" ? 300 : 1000} defaultValue={c?.content.body} placeholder={t("bodyPlaceholder")} /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("coupon")} htmlFor="cp-coupon"><select id="cp-coupon" name="coupon_id" className={sel} defaultValue={c?.coupon_id ?? ""}><option value="">{t("noCoupon")}</option>{coupons.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        <Field label={t("sendAt")} htmlFor="cp-when">
          <div className="flex gap-2"><select id="cp-when" className={sel} value={later ? "later" : "now"} onChange={(e) => setLater(e.target.value === "later")}><option value="now">{t("sendNow")}</option><option value="later">{t("sendLater")}</option></select>
            {later && <Input name="send_at" type="datetime-local" required defaultValue={c?.scheduled_at?.slice(0, 16)} />}</div>
        </Field>
      </div>
      <div className="flex justify-end gap-2"><SubmitButton name="intent" value="draft" variant="secondary">{t("saveDraft")}</SubmitButton><SubmitButton name="intent" value="schedule" variant="accent"><Send />{t("schedule")}</SubmitButton></div>
    </ActionForm>
  );
}

export function CampaignsManager({ campaigns, programs, coupons, tags, connected }: { campaigns: CampaignRow[]; programs: Opt[]; coupons: Opt[]; tags: string[]; connected: { email: boolean; wallet: boolean } }) {
  const t = useTranslations("camp");
  const format = useFormatter();
  const [editing, setEditing] = useState<CampaignRow | "new" | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <div className="flex justify-end"><Button onClick={() => setEditing("new")}><Plus />{t("new")}</Button></div>
      {!campaigns.length ? <EmptyState icon={<Megaphone />} title={t("new")} description={t("empty")} /> : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <Card key={c.id} className="flex flex-wrap items-center gap-4 p-5">
              <span className="grid size-11 place-items-center rounded-xl bg-ink-900 text-lime-300">{c.channel === "email" ? <Mail className="size-5" /> : <Wallet className="size-5" />}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><span className="truncate font-semibold">{c.name}</span><Badge tone={TONE[c.status]} dot>{t(`statuses.${c.status}`)}</Badge>{c.status === "scheduled" && !connected[c.channel] && <Badge tone="warning">{t("awaiting")}</Badge>}</div>
                <div className="mt-0.5 text-xs text-fg-muted">{t(`segments.${c.segment.type}`).replace("…", c.segment.days ? ` ${c.segment.days} j` : "")}{c.scheduled_at ? ` · ${format.dateTime(new Date(c.scheduled_at), { dateStyle: "medium", timeStyle: "short" })}` : ""}</div>
              </div>
              {c.status !== "draft" && <div className="flex gap-4 text-center text-sm">{(["targeted", "sent", "failed"] as const).map((k) => <div key={k}><div className="tabular font-semibold">{c.stats[k] ?? 0}</div><div className="text-xs text-fg-muted">{t(`stats.${k}`)}</div></div>)}</div>}
              <div className="flex gap-1">
                {(c.status === "draft" || c.status === "scheduled") && <Button size="icon" variant="ghost" onClick={() => setEditing(c)} aria-label={t("edit")}><Pencil /></Button>}
                {c.status === "scheduled" && <Button size="icon" variant="ghost" disabled={pending} onClick={() => start(() => cancelCampaign(c.id))} aria-label={t("cancel")}><Ban /></Button>}
                {c.status === "draft" && <Button size="icon" variant="ghost" disabled={pending} onClick={() => start(() => deleteCampaign(c.id))} aria-label={t("delete")}><Trash2 /></Button>}
              </div>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        {editing !== null && <DialogContent title={editing === "new" ? t("new") : t("edit")} className="sm:max-w-xl"><CampaignForm c={editing === "new" ? null : editing} programs={programs} coupons={coupons} tags={tags} connected={connected} onDone={() => setEditing(null)} /></DialogContent>}
      </Dialog>
    </>
  );
}
