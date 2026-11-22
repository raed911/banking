"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Single series bar chart. Color #6f9a1b validated on the light surface.
export function SimpleBarChart({ data, xKey, yKey, label, format }: { data: Record<string, number | string>[]; xKey: string; yKey: string; label: string; format?: (v: string | number) => string }) {
  const fmt = format ?? ((v: string | number) => String(v));
  return (
    <div className="h-[220px]" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey={xKey} tickFormatter={fmt} tickLine={false} axisLine={false} tick={{ fill: "var(--fg-subtle)", fontSize: 11 }} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--fg-subtle)", fontSize: 11 }} />
          <Tooltip cursor={{ fill: "var(--surface-sunken)" }} content={({ active, payload, label: l }) => active && payload?.length ? (
            <div className="rounded-xl border border-border bg-surface px-3 py-2 text-xs shadow-lg"><div className="text-fg-muted">{fmt(l as string)}</div><div><span className="tabular font-semibold">{payload[0]!.value as number}</span> <span className="text-fg-muted">{label}</span></div></div>
          ) : null} />
          <Bar dataKey={yKey} fill="#6f9a1b" radius={[4, 4, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
