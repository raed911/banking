"use client";
import { ActionForm } from "@/components/forms/action-form";
import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Ban, Copy, ExternalLink, Megaphone, MessageSquare, MoreHorizontal, Pencil, Plus, SlidersHorizontal, Ticket, Trash2, Undo2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { adjust, applyCoupon, earn, reverseTransaction } from "@/features/loyalty/actions";
import { deleteCustomer, issueCard, setCardStatus, updateCustomer } from "@/features/customers/actions";
import { sendCustomerMessage } from "@/features/campaigns/actions";
import { Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormAlert } from "@/components/forms/form-alert";
import { CustomerFields, type CustomerValues } from "../customer-fields";

function useOpError() {
  const ts = useTranslations("scan");
  return (r: { ok: boolean; error?: string }) => {
    if (r.ok) return false;
    toast.error(ts.has(`errors.${r.error}`) ? ts(`errors.${r.error}` as "errors.generic") : ts("errors.generic"));
    return true;
  };
}

export function CardActions({ customerId, card, cardUrl, canEarn, canAdjust, canCoupon }: { customerId: string; card: { id: string; status: string; type: string; pointsPerUnit: number | null }; cardUrl: string; canEarn: boolean; canAdjust: boolean; canCoupon: boolean }) {
  const t = useTranslations("customers.profile");
  const ts = useTranslations("scan");
  const [pending, start] = useTransition();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [couponOpen, setCouponOpen] = useState(false);
  const [code, setCode] = useState("");
  const fail = useOpError();
  return (
    <div className="flex items-center gap-2">
      {canCoupon && card.status === "active" && (
        <Button size="sm" variant="secondary" onClick={() => setCouponOpen(true)}><Ticket />{t("applyCoupon")}</Button>
      )}
      {canEarn && card.status === "active" && card.type !== "points" && (
        <Button size="sm" variant="accent" loading={pending} onClick={() => start(async () => { const r = await earn(card.id, crypto.randomUUID(), { amount: 1 }); if (!fail(r)) toast.success(ts("success.earn", { amount: 1 })); })}><Plus />{t("earn")}</Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button size="icon" variant="secondary" aria-label="Actions"><MoreHorizontal /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => window.open(cardUrl, "_blank", "noopener")}><ExternalLink />{t("openCard")}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigator.clipboard.writeText(cardUrl).then(() => toast.success(t("copied")))}><Copy />{t("copyLink")}</DropdownMenuItem>
          {canAdjust && <DropdownMenuItem onSelect={() => setAdjustOpen(true)}><SlidersHorizontal />{t("adjust")}</DropdownMenuItem>}
          {canAdjust && <DropdownMenuItem danger={card.status === "active"} onSelect={() => start(() => setCardStatus(customerId, card.id, card.status === "active" ? "blocked" : "active"))}><Ban />{card.status === "active" ? t("block") : t("unblock")}</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={couponOpen} onOpenChange={setCouponOpen}>
        <DialogContent title={t("applyCoupon")}>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await applyCoupon(card.id, code, crypto.randomUUID()); if (!fail(r)) { toast.success(t("couponApplied", { name: String(r.ok ? r.data.coupon : "") })); setCouponOpen(false); setCode(""); } }); }}>
            <Field label={t("couponCode")} htmlFor="cp-code"><Input id="cp-code" required minLength={3} maxLength={24} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="h-12 font-mono text-lg uppercase tracking-wider" dir="ltr" autoFocus /></Field>
            <div className="flex justify-end"><Button type="submit" loading={pending} disabled={code.trim().length < 3}>{t("apply")}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent title={t("adjustTitle")}>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await adjust(card.id, crypto.randomUUID(), Number(amount), reason); if (!fail(r)) { setAdjustOpen(false); setAmount(""); setReason(""); } }); }}>
            <Field label={t("amount")} htmlFor="adj-amount"><Input id="adj-amount" type="number" required value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
            <Field label={t("reason")} htmlFor="adj-reason"><Input id="adj-reason" required minLength={2} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
            <div className="flex justify-end"><Button type="submit" loading={pending} disabled={!Number(amount) || reason.trim().length < 2}>{t("adjust")}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ReverseButton({ transactionId }: { transactionId: string }) {
  const t = useTranslations("customers.profile");
  const [pending, start] = useTransition();
  const fail = useOpError();
  return (
    <Button size="xs" variant="ghost" className="w-16" disabled={pending} onClick={() => { const reason = prompt(t("reverseReason")); if (reason && reason.trim().length >= 2) start(async () => { fail(await reverseTransaction(transactionId, reason)); }); }}>
      <Undo2 />{t("reverse")}
    </Button>
  );
}

export function IssueCard({ customerId, programs }: { customerId: string; programs: { id: string; name: string }[] }) {
  const t = useTranslations("customers");
  const [pending, start] = useTransition();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button size="sm" variant="secondary" loading={pending}><Plus />{t("profile.issueCard")}</Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {programs.map((p) => <DropdownMenuItem key={p.id} onSelect={() => start(async () => { const r = await issueCard(customerId, p.id); if (r?.error) toast.error(t(`errors.${r.error}` as "errors.generic")); })}>{p.name}</DropdownMenuItem>)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** One-off message to this customer: Wallet notification (if a Wallet card is installed) or an announcement on the card page. */
export function MessageCustomer({ customerId, name, hasWallet, consent }: { customerId: string; name: string; hasWallet: boolean; consent: boolean }) {
  const t = useTranslations("customers.profile.message");
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<"wallet" | "card">(hasWallet ? "wallet" : "card");
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}><MessageSquare />{t("button")}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={t("title", { name })}>
          {!consent ? <FormAlert>{t("noConsent")}</FormAlert> : (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); start(async () => {
              const r = await sendCustomerMessage(customerId, channel, body);
              if (!r.ok) { toast.error(t.has(`errors.${r.error}`) ? t(`errors.${r.error}` as "errors.generic") : t("errors.generic")); return; }
              toast.success(t("sent")); setOpen(false); setBody("");
            }); }}>
              <div className="grid grid-cols-2 gap-2" role="radiogroup">
                {([["wallet", Wallet, hasWallet], ["card", Megaphone, true]] as const).map(([key, Icon, enabled]) => (
                  <button key={key} type="button" role="radio" aria-checked={channel === key} disabled={!enabled} onClick={() => setChannel(key)}
                    className={cn("flex items-center gap-2 rounded-xl border p-3 text-start text-sm font-medium transition disabled:opacity-40", channel === key ? "border-ink-900 bg-ink-900 text-white" : "border-border-strong")}>
                    <Icon className="size-4 shrink-0" />{t(`channels.${key}`)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-fg-muted">{channel === "wallet" ? t("walletHint") : hasWallet ? t("cardHint") : t("noWallet")}</p>
              <Field label={t("label")} htmlFor="msg-body"><Textarea id="msg-body" required minLength={3} maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} placeholder={t("placeholder")} /></Field>
              <div className="flex justify-end"><Button type="submit" loading={pending} disabled={body.trim().length < 3}>{t("send")}</Button></div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function EditCustomer({ customer }: { customer: CustomerValues & { id: string } }) {
  const t = useTranslations("customers");
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(async (prev: Awaited<ReturnType<typeof updateCustomer>>, fd: FormData) => {
    const r = await updateCustomer(customer.id, prev, fd);
    if (r?.ok) setOpen(false);
    return r;
  }, null);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}><Pencil />{t("profile.edit")}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={`${customer.first_name} ${customer.last_name ?? ""}`}>
          <ActionForm action={action} className="space-y-5">
            <FormAlert>{state?.error ? t(`errors.${state.error}` as "errors.generic") : null}</FormAlert>
            <CustomerFields c={customer} />
            <div className="flex justify-end"><SubmitButton>{t("form.save")}</SubmitButton></div>
          </ActionForm>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function DeleteCustomer({ id }: { id: string }) {
  const t = useTranslations("customers.profile");
  const [pending, start] = useTransition();
  return <Button variant="ghost" size="icon" aria-label={t("delete")} disabled={pending} onClick={() => confirm(t("deleteConfirm")) && start(() => deleteCustomer(id))}><Trash2 /></Button>;
}
