"use client";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLocale } from "next-intl";

// Validated palette (light surface): earned #6f9a1b · redeemed #3e6fd8 — passes CVD, lightness, chroma, contrast checks.
const SERIES = [
  { key: "earned", color: "#6f9a1b" },
  { key: "redeemed", color: "#3e6fd8" },
] as const;

type Point = { day: string; earned: number; redeemed: number };

export function ActivityChart({ data, labels }: { data: Point[]; labels: { earned: string; redeemed: string } }) {
  const locale = useLocale();
  const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(locale, { day: "numeric", month: "short" });
  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs text-fg-muted" aria-hidden>
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />{labels[s.key]}</span>
        ))}
      </div>
      <div className="h-[260px] w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <defs>
              {SERIES.map((s) => (
                <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="day" tickFormatter={fmt} tickLine={false} axisLine={false} minTickGap={28} tick={{ fill: "var(--fg-subtle)", fontSize: 11 }} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={44} tick={{ fill: "var(--fg-subtle)", fontSize: 11 }} />
            <Tooltip
              cursor={{ stroke: "var(--color-ink-300)", strokeWidth: 1 }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="rounded-xl border border-border bg-surface px-3 py-2 text-xs shadow-lg">
                    <div className="mb-1.5 font-medium text-fg-muted">{fmt(String(label))}</div>
                    {SERIES.map((s) => (
                      <div key={s.key} className="flex items-center gap-2">
                        <span className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
                        <span className="tabular font-semibold text-fg">{(payload.find((p) => p.dataKey === s.key)?.value as number) ?? 0}</span>
                        <span className="text-fg-muted">{labels[s.key]}</span>
                      </div>
                    ))}
                  </div>
                ) : null
              }
            />
            {SERIES.map((s) => (
              <Area key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2} fill={`url(#fill-${s.key})`} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <thead><tr><th>Date</th><th>{labels.earned}</th><th>{labels.redeemed}</th></tr></thead>
        <tbody>{data.map((d) => <tr key={d.day}><td>{d.day}</td><td>{d.earned}</td><td>{d.redeemed}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
