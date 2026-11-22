"use client";
import { ActionForm } from "@/components/forms/action-form";
import { useActionState, useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Ban, CalendarPlus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { extendTrial, recordPayment, setMerchantStatus } from "@/features/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormAlert } from "@/components/forms/form-alert";

const selectCls = "h-10 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm";

export function PaymentForm({ merchantId, prices, quantity, openInvoices }: { merchantId: string; prices: { id: string; period: string; interval_months: number; amount_millimes: number }[]; quantity: number; openInvoices: { id: string; number: string; total: number }[] }) {
  const t = useTranslations("admin");
  const format = useFormatter();
  const [state, action] = useActionState(recordPayment.bind(null, merchantId), null);
  const [priceId, setPriceId] = useState(prices[0]?.id ?? "");
  const [qty, setQty] = useState(quantity);
  const price = prices.find((p) => p.id === priceId);
  const suggested = price ? (price.amount_millimes * qty) / 1000 : 0;
  return (
    <Card className="border-ink-900/10 shadow-md">
      <CardHeader><div><CardTitle>{t("merchant.recordPayment")}</CardTitle><CardDescription>{t("merchant.recordDesc")}</CardDescription></div></CardHeader>
      <CardContent>
        <ActionForm action={action} className="space-y-4" key={state?.ok ? String(state.data?.payment_id) : "form"}>
          <FormAlert>{state?.error ? t(`errors.${state.error}` as "errors.generic") : null}</FormAlert>
          <FormAlert tone="success">{state?.ok ? t("merchant.paymentSaved", { date: format.dateTime(new Date(String(state.data?.current_period_end)), { dateStyle: "long" }) }) : null}</FormAlert>
          {openInvoices.length > 0 && (
            <Field label={t("merchant.invoice")} htmlFor="invoice_id">
              <select id="invoice_id" name="invoice_id" className={selectCls} defaultValue={openInvoices[0]!.id}>
                <option value="">{t("merchant.noInvoice")}</option>
                {openInvoices.map((i) => <option key={i.id} value={i.id}>{i.number} · {i.total} TND</option>)}
              </select>
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("merchant.price")} htmlFor="price_id">
              <select id="price_id" name="price_id" className={selectCls} value={priceId} onChange={(e) => setPriceId(e.target.value)}>
                {prices.map((p) => <option key={p.id} value={p.id}>{t(`period.${p.period}`)} · {p.amount_millimes / 1000} TND</option>)}
              </select>
            </Field>
            <Field label={t("merchant.quantity")} htmlFor="quantity"><Input id="quantity" name="quantity" type="number" min={1} max={1000} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("merchant.amount")} htmlFor="amount"><Input id="amount" name="amount" type="number" step="0.001" min="0.001" required defaultValue={suggested} key={suggested} /></Field>
            <Field label={t("merchant.method")} htmlFor="method">
              <select id="method" name="method" className={selectCls} defaultValue="cash">
                {(["cash", "bank_transfer", "cheque", "card", "other"] as const).map((m) => <option key={m} value={m}>{t(`merchant.methods.${m}`)}</option>)}
              </select>
            </Field>
          </div>
          <Field label={t("merchant.reference")} htmlFor="reference"><Input id="reference" name="reference" maxLength={80} /></Field>
          <Field label={t("merchant.notes")} htmlFor="notes"><Input id="notes" name="notes" maxLength={500} /></Field>
          <SubmitButton variant="accent" size="lg" className="w-full"><CheckCircle2 />{t("merchant.save")}</SubmitButton>
        </ActionForm>
      </CardContent>
    </Card>
  );
}

export function AccountControls({ merchantId, status, canExtend }: { merchantId: string; status: string; canExtend: boolean }) {
  const t = useTranslations("admin.merchant");
  const [pending, start] = useTransition();
  const [days, setDays] = useState(14);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {canExtend && (
        <div className="flex items-center gap-1 rounded-xl border border-border-strong bg-surface p-1">
          <Input type="number" min={1} max={365} value={days} onChange={(e) => setDays(Number(e.target.value) || 1)} className="h-8 w-16 border-0 shadow-none" aria-label={t("days")} />
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(async () => { const r = await extendTrial(merchantId, days); if (r.ok) toast.success(t("trialExtended")); })}><CalendarPlus />{t("extend")}</Button>
        </div>
      )}
      {status === "active" ? (
        <Button variant="danger" size="sm" disabled={pending} onClick={() => { if (!confirm(t("suspendConfirm"))) return; const reason = prompt(t("suspendReason")) ?? ""; start(async () => { const r = await setMerchantStatus(merchantId, "suspended", reason); if (r.ok) toast.success(t("statusChanged")); }); }}><Ban />{t("suspend")}</Button>
      ) : (
        <Button size="sm" disabled={pending} onClick={() => start(async () => { const r = await setMerchantStatus(merchantId, "active"); if (r.ok) toast.success(t("statusChanged")); })}>{t("reactivate")}</Button>
      )}
    </div>
  );
}
