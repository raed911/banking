"use client";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { UserPlus } from "lucide-react";
import { createCustomer } from "@/features/customers/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormAlert } from "@/components/forms/form-alert";
import { CustomerFields } from "./customer-fields";

export function AddCustomer({ programs, defaultOpen }: { programs: { id: string; name: string }[]; defaultOpen?: boolean }) {
  const t = useTranslations("customers");
  const [open, setOpen] = useState(!!defaultOpen);
  const [state, action] = useActionState(createCustomer, null);
  return (
    <>
      <Button onClick={() => setOpen(true)}><UserPlus />{t("add")}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={t("add")}>
          <form action={action} className="space-y-5">
            <FormAlert>{state?.error ? t(`errors.${state.error}` as "errors.generic") : null}</FormAlert>
            <CustomerFields programs={programs} />
            <div className="flex justify-end"><SubmitButton>{t("form.create")}</SubmitButton></div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
