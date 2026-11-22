"use client";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Minus, Plus } from "lucide-react";
import { requestInvoice } from "@/features/billing/actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormAlert } from "@/components/forms/form-alert";
import { cn } from "@/lib/utils";

type Price = { id: string; period: string; interval_months: number; amount_millimes: number; label: string | null; badge: string | null };

export function PlanPicker({ prices, quantity }: { prices: Price[]; quantity: number }) {
  const t = useTranslations("billing");
  const [state, action] = useActionState(requestInvoice, null);
  const [selected, setSelected] = useState(prices.find((p) => p.interval_months === 12)?.id ?? prices[0]?.id);
  const [qty, setQty] = useState(quantity);
  const price = prices.find((p) => p.id === selected);
  const suffix = (m: number) => (m === 1 ? t("perMonth") : m === 6 ? t("per6") : t("perYear"));
  return (
    <form action={action} className="space-y-4">
      <div><h2 className="text-lg font-semibold tracking-[-0.02em]">{t("choose")}</h2><p className="text-sm text-fg-muted">{t("chooseDesc")}</p></div>
      <FormAlert>{state?.error ? t("error") : null}</FormAlert>
      <FormAlert tone="success">{state?.ok ? t("requested") : null}</FormAlert>
      <input type="hidden" name="price_id" value={selected} />
      <input type="hidden" name="quantity" value={qty} />
      <div className="grid gap-4 md:grid-cols-3">
        {prices.map((p) => {
          const on = p.id === selected;
          return (
            <button type="button" key={p.id} onClick={() => setSelected(p.id)} aria-pressed={on}
              className={cn("relative overflow-hidden rounded-3xl border p-6 text-start transition-all", on ? "border-ink-900 bg-ink-900 text-white shadow-xl" : "border-border bg-surface hover:border-ink-300")}>
              {p.badge && <span className={cn("absolute end-4 top-4 rounded-full px-2.5 py-1 text-xs font-bold", on ? "bg-lime-300 text-ink-900" : "bg-lime-100 text-lime-800")}>{p.badge}</span>}
              <div className={cn("text-sm font-medium", on ? "text-lime-300" : "text-fg-muted")}>{p.label}</div>
              <div className="mt-3 flex items-end gap-1.5"><span className="font-display text-6xl leading-none">{p.amount_millimes / 1000}</span><span className={cn("pb-1 text-sm", on ? "text-ink-300" : "text-fg-muted")}>TND {suffix(p.interval_months)}</span></div>
              <ul className={cn("mt-5 space-y-2 text-sm", on ? "text-ink-200" : "text-fg-muted")}>
                {(t.raw("features") as string[]).map((f) => <li key={f} className="flex items-center gap-2"><Check className={cn("size-4", on ? "text-lime-300" : "text-lime-600")} />{f}</li>)}
              </ul>
            </button>
          );
        })}
      </div>
      <div className="flex flex-col items-stretch justify-between gap-4 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">{t("quantity")}</span>
          <div className="flex items-center rounded-xl border border-border-strong">
            <button type="button" className="grid size-9 place-items-center" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="-"><Minus className="size-4" /></button>
            <span className="tabular w-8 text-center font-semibold">{qty}</span>
            <button type="button" className="grid size-9 place-items-center" onClick={() => setQty((q) => Math.min(100, q + 1))} aria-label="+"><Plus className="size-4" /></button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <span className="text-sm text-fg-muted">{t("total")} <span className="tabular ms-1 text-xl font-semibold text-fg">{price ? (price.amount_millimes * qty) / 1000 : 0} TND</span></span>
          <SubmitButton variant="accent" size="lg">{t("request")}</SubmitButton>
        </div>
      </div>
    </form>
  );
}
