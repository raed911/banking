"use client";
import { useContext } from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";
import { FormPendingContext } from "./action-form";

export function SubmitButton(props: ButtonProps) {
  const { pending } = useFormStatus();
  const actionPending = useContext(FormPendingContext);
  return <Button type="submit" loading={pending || actionPending} {...props} />;
}
