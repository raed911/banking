"use client";
import { useTransition } from "react";
import { Check } from "lucide-react";
import { reviewFraudSignal } from "@/features/coupons/actions";
import { Button } from "@/components/ui/button";

export function ReviewButton({ id, label }: { id: string; label: string }) {
  const [pending, start] = useTransition();
  return <Button size="sm" variant="secondary" loading={pending} onClick={() => start(() => reviewFraudSignal(id))}><Check />{label}</Button>;
}
