"use client";
import { useActionState, useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Pencil, Plus, Ticket, Trash2 } from "lucide-react";
import { deleteCoupon, saveCoupon } from "@/features/coupons/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/states";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormAlert } from "@/components/forms/form-alert";

type Coupon = { id: string; name: string; code: string; kind: "percent" | "fixed" | "free_item" | "custom"; value: number | null; status: "draft" | "active" | "paused" | "expired" | "archived"; starts_at: string | null; ends_at: string | null; max_redemptions: number | null; per_customer_limit: number; redemptions_count: number; terms: string | null };
const sel = "h-10 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm";
const toLocal = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");
const TONE = { active: "success", draft: "neutral", paused: "warning", expired: "danger", archived: "neutral" } as const;

function CouponForm({ c, onDone }: { c: Coupon | null; onDone: () => void }) {
  const t = useTranslations("coupons");
  const [kind, setKind] = useState(c?.kind ?? "percent");
  const [state, action] = useActionState(async (p: Awaited<ReturnType<typeof saveCoupon>>, fd: FormData) => { const r = await saveCoupon(c?.id ?? null, p, fd); if (r?.ok) onDone(); return r; }, null);
  return (
    <form action={action} className="space-y-4">
      <FormAlert>{state?.error ? t(`errors.${state.error}` as "errors.generic") : null}</FormAlert>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("name")} htmlFor="c-name"><Input id="c-name" name="name" required maxLength={80} defaultValue={c?.name} /></Field>
        <Field label={t("code")} htmlFor="c-code" hint={c ? undefined : t("codeHint")}><Input id="c-code" name="code" required pattern="[A-Za-z0-9-]{3,24}" defaultValue={c?.code} readOnly={!!c} className="font-mono uppercase" dir="ltr" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("kind")} htmlFor="c-kind"><select id="c-kind" name="kind" className={sel} value={kind} onChange={(e) => setKind(e.target.value as Coupon["kind"])}>{(["percent", "fixed", "free_item", "custom"] as const).map((k) => <option key={k} value={k}>{t(`kinds.${k}`)}</option>)}</select></Field>
        <Field label={t("value")} htmlFor="c-value"><Input id="c-value" name="value" type="number" step="0.001" min="0" max={kind === "percent" ? 100 : undefined} required={kind === "percent" || kind === "fixed"} disabled={kind === "free_item" || kind === "custom"} defaultValue={c?.value ?? ""} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("startsAt")} htmlFor="c-start"><Input id="c-start" name="starts_at" type="datetime-local" defaultValue={toLocal(c?.starts_at ?? null)} /></Field>
        <Field label={t("endsAt")} htmlFor="c-end"><Input id="c-end" name="ends_at" type="datetime-local" defaultValue={toLocal(c?.ends_at ?? null)} /></Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label={t("max")} htmlFor="c-max"><Input id="c-max" name="max_redemptions" type="number" min={1} defaultValue={c?.max_redemptions ?? ""} placeholder="∞" /></Field>
        <Field label={t("perCustomer")} htmlFor="c-per"><Input id="c-per" name="per_customer_limit" type="number" min={1} defaultValue={c?.per_customer_limit ?? 1} /></Field>
        <Field label={t("status")} htmlFor="c-status"><select id="c-status" name="status" className={sel} defaultValue={c?.status === "expired" ? "paused" : c?.status ?? "active"}>{(["active", "draft", "paused", "archived"] as const).map((s) => <option key={s} value={s}>{t(`statuses.${s}`)}</option>)}</select></Field>
      </div>
      <Field label={t("terms")} htmlFor="c-terms"><Textarea id="c-terms" name="terms" maxLength={500} defaultValue={c?.terms ?? ""} className="min-h-16" /></Field>
      <div className="flex justify-end"><SubmitButton>{t("save")}</SubmitButton></div>
    </form>
  );
}

export function CouponsManager({ coupons, canEdit }: { coupons: Coupon[]; canEdit: boolean }) {
  const t = useTranslations("coupons");
  const format = useFormatter();
  const [editing, setEditing] = useState<Coupon | "new" | null>(null);
  const [pending, start] = useTransition();
  const value = (c: Coupon) => (c.kind === "percent" ? `-${c.value}%` : c.kind === "fixed" ? `-${c.value} TND` : t(`kinds.${c.kind}`));
  return (
    <>
      {canEdit && <div className="flex justify-end"><Button onClick={() => setEditing("new")}><Plus />{t("add")}</Button></div>}
      {!coupons.length ? <EmptyState icon={<Ticket />} title={t("title")} description={t("empty")} /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {coupons.map((c) => (
            <div key={c.id} className="relative overflow-hidden rounded-3xl border border-border bg-surface">
              <div className="flex items-center justify-between bg-ink-900 px-5 py-4 text-white">
                <span className="font-display text-3xl text-lime-300">{value(c)}</span>
                <Badge tone={TONE[c.status]} dot>{t(`statuses.${c.status}`)}</Badge>
              </div>
              <div className="absolute -start-3 top-[60px] size-6 rounded-full bg-bg" /><div className="absolute -end-3 top-[60px] size-6 rounded-full bg-bg" />
              <div className="space-y-3 border-t border-dashed border-border-strong p-5">
                <div className="flex items-center justify-between gap-3"><span className="truncate font-semibold">{c.name}</span><span className="rounded-lg bg-surface-sunken px-2 py-1 font-mono text-sm font-semibold" dir="ltr">{c.code}</span></div>
                <div className="text-xs text-fg-muted">
                  {t("used", { count: c.redemptions_count })} / {c.max_redemptions ?? t("unlimited")}
                  {c.ends_at && <> · {t("endsAt")} {format.dateTime(new Date(c.ends_at), { dateStyle: "medium" })}</>}
                </div>
                {canEdit && <div className="flex gap-1"><Button size="sm" variant="secondary" onClick={() => setEditing(c)}><Pencil />{t("edit").split(" ")[0]}</Button><Button size="sm" variant="ghost" disabled={pending} onClick={() => start(() => deleteCoupon(c.id))} aria-label={t("delete")}><Trash2 /></Button></div>}
              </div>
            </div>
          ))}
        </div>
      )}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        {editing !== null && <DialogContent title={editing === "new" ? t("add") : t("edit")}><CouponForm c={editing === "new" ? null : editing} onDone={() => setEditing(null)} /></DialogContent>}
      </Dialog>
    </>
  );
}
