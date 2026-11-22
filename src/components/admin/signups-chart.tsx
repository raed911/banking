"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLocale } from "next-intl";

// Single series: validated green #6f9a1b on light surface (passes contrast/lightness checks).
export function SignupsChart({ data, label }: { data: { day: string; merchants: number }[]; label: string }) {
  const locale = useLocale();
  const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(locale, { day: "numeric", month: "short" });
  return (
    <div className="h-[220px]" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="day" tickFormatter={fmt} tickLine={false} axisLine={false} minTickGap={24} tick={{ fill: "var(--fg-subtle)", fontSize: 11 }} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--fg-subtle)", fontSize: 11 }} />
          <Tooltip cursor={{ fill: "var(--surface-sunken)" }} content={({ active, payload, label: l }) => active && payload?.length ? (
            <div className="rounded-xl border border-border bg-surface px-3 py-2 text-xs shadow-lg"><div className="text-fg-muted">{fmt(String(l))}</div><div><span className="tabular font-semibold">{payload[0]!.value as number}</span> <span className="text-fg-muted">{label}</span></div></div>
          ) : null} />
          <Bar dataKey="merchants" fill="#6f9a1b" radius={[4, 4, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
