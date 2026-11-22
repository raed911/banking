"use client";
import { ActionForm } from "@/components/forms/action-form";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Gift, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteReward, saveReward } from "@/features/programs/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/states";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormAlert } from "@/components/forms/form-alert";

type Reward = { id: string; name: string; description: string | null; cost: number; stock: number | null; is_active: boolean };

function RewardForm({ programId, reward, unit, onDone }: { programId: string; reward: Reward | null; unit: string; onDone: () => void }) {
  const t = useTranslations("programs");
  const [state, action] = useActionState(saveReward.bind(null, programId, reward?.id ?? null), null);
  useEffect(() => { if (state?.ok) onDone(); }, [state, onDone]);
  return (
    <ActionForm action={action} className="space-y-4">
      <FormAlert>{state?.error ? t(`errors.${state.error}` as "errors.generic") : null}</FormAlert>
      <Field label={t("rewards.name")} htmlFor="r-name"><Input id="r-name" name="name" required minLength={2} maxLength={80} defaultValue={reward?.name} placeholder={t("form.rewardPlaceholder")} /></Field>
      <Field label={t("form.description")} htmlFor="r-desc"><Input id="r-desc" name="description" maxLength={240} defaultValue={reward?.description ?? ""} /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label={`${t("rewards.cost")} (${unit})`} htmlFor="r-cost"><Input id="r-cost" name="cost" type="number" min={1} required defaultValue={reward?.cost ?? 10} /></Field>
        <Field label={t("rewards.stock")} htmlFor="r-stock" hint={t("rewards.stockHint")}><Input id="r-stock" name="stock" type="number" min={0} defaultValue={reward?.stock ?? ""} /></Field>
      </div>
      <label className="flex items-center justify-between rounded-xl border border-border p-3 text-sm font-medium">{t("rewards.active")}<Switch name="is_active" defaultChecked={reward?.is_active ?? true} /></label>
      <div className="flex justify-end"><SubmitButton>{t("form.save")}</SubmitButton></div>
    </ActionForm>
  );
}

export function RewardsManager({ programId, type, rewards, canEdit }: { programId: string; type: "stamps" | "points" | "visits"; rewards: Reward[]; canEdit: boolean }) {
  const t = useTranslations("programs");
  const [editing, setEditing] = useState<Reward | null | "new">(null);
  const [pending, start] = useTransition();
  const unit = t(`units.${type}`);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">{t("rewards.desc", { unit })}</p>
        {canEdit && <Button onClick={() => setEditing("new")}><Plus />{t("rewards.add")}</Button>}
      </div>
      {!rewards.length ? (
        <EmptyState icon={<Gift />} title={t("rewards.title")} description={t("rewards.empty")} />
      ) : (
        <Card className="divide-y divide-border overflow-hidden">
          {rewards.map((r) => (
            <div key={r.id} className="flex items-center gap-4 p-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-lime-100 text-lime-800"><Gift className="size-5" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><span className="truncate font-medium">{r.name}</span>{!r.is_active && <Badge>{t("enroll.inactive")}</Badge>}</div>
                <div className="truncate text-sm text-fg-muted">{r.description || " "}</div>
              </div>
              <div className="text-end">
                <div className="tabular font-semibold">{r.cost} <span className="text-xs font-normal text-fg-muted">{unit}</span></div>
                <div className="text-xs text-fg-muted">{r.stock == null ? t("rewards.unlimited") : `${t("rewards.stock")}: ${r.stock}`}</div>
              </div>
              {canEdit && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setEditing(r)} aria-label={t("rewards.edit")}><Pencil /></Button>
                  <Button variant="ghost" size="icon" disabled={pending} aria-label={t("rewards.delete")} onClick={() => confirm(t("rewards.deleteConfirm")) && start(() => deleteReward(programId, r.id))}><Trash2 /></Button>
                </div>
              )}
            </div>
          ))}
        </Card>
      )}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        {editing !== null && (
          <DialogContent title={editing === "new" ? t("rewards.add") : t("rewards.edit")}>
            <RewardForm programId={programId} reward={editing === "new" ? null : editing} unit={unit} onDone={() => setEditing(null)} />
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
