"use client";
import { useState } from "react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";

/** Day + month birthday picker (no year). Submits `name` as "2000-MM-DD" (leap year, so 29 Feb works) or "". */
export function BirthdayInput({ name = "birthday", defaultValue, className, size = "md", id }: { name?: string; defaultValue?: string | null; className?: string; size?: "md" | "lg"; id?: string }) {
  const locale = useLocale();
  const [day, setDay] = useState(defaultValue ? String(Number(defaultValue.slice(8, 10))) : "");
  const [month, setMonth] = useState(defaultValue ? String(Number(defaultValue.slice(5, 7))) : "");
  const months = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString(locale, { month: "long" }));
  const maxDay = month ? new Date(2000, Number(month), 0).getDate() : 31;
  const value = day && month && Number(day) <= maxDay ? `2000-${month.padStart(2, "0")}-${day.padStart(2, "0")}` : "";
  const cls = cn("w-full rounded-lg border border-border-strong bg-surface px-3 text-sm focus:border-ink-900 focus:outline-none focus:ring-4 focus:ring-[var(--ring)]", size === "lg" ? "h-12 text-base" : "h-10");
  return (
    <div className={cn("grid grid-cols-[1fr_2fr] gap-2", className)}>
      <input type="hidden" name={name} value={value} />
      <select id={id} aria-label="Jour" value={day} onChange={(e) => setDay(e.target.value)} className={cls}>
        <option value="">—</option>
        {Array.from({ length: maxDay }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
      </select>
      <select aria-label="Mois" value={month} onChange={(e) => setMonth(e.target.value)} className={cls}>
        <option value="">—</option>
        {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
      </select>
    </div>
  );
}
