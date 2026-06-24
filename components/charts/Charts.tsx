"use client";

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ReferenceLine,
  Cell,
} from "recharts";

const AXIS = { fontSize: 11, fill: "var(--muted-foreground)" } as const;
const GRID = "var(--border)";

function TooltipBox({ active, payload, label, suffix }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 shadow-xl text-xs">
      {label != null && <p className="font-medium mb-1 text-foreground">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color ?? p.stroke ?? p.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground numeral">
            {typeof p.value === "number" ? Math.round(p.value * 10) / 10 : p.value}
            {suffix ?? ""}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Single or multi-series line chart over time. */
export function LineTrend({
  data,
  xKey = "label",
  series,
  height = 240,
  domain,
  suffix,
}: {
  data: any[];
  xKey?: string;
  series: { key: string; name: string; color: string }[];
  height?: number;
  domain?: [number, number];
  suffix?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} domain={domain ?? [0, 100]} width={34} />
        <Tooltip content={<TooltipBox suffix={suffix} />} />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Filled area trend, single series. */
export function AreaTrend({
  data,
  xKey = "label",
  dataKey,
  name,
  color,
  height = 200,
  domain,
  suffix,
}: {
  data: any[];
  xKey?: string;
  dataKey: string;
  name: string;
  color: string;
  height?: number;
  domain?: [number, number];
  suffix?: string;
}) {
  const id = `grad-${dataKey}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} domain={domain ?? [0, 100]} width={34} />
        <Tooltip content={<TooltipBox suffix={suffix} />} />
        <Area type="monotone" dataKey={dataKey} name={name} stroke={color} strokeWidth={2.5} fill={`url(#${id})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Scatter plot — correlate two metrics (e.g. sleep vs mood). */
export function ScatterPlot({
  data,
  xKey,
  yKey,
  xName,
  yName,
  color,
  height = 260,
  xDomain,
  yDomain,
}: {
  data: any[];
  xKey: string;
  yKey: string;
  xName: string;
  yName: string;
  color: string;
  height?: number;
  xDomain?: [number, number] | ["auto", "auto"];
  yDomain?: [number, number] | ["auto", "auto"];
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 8, right: 12, left: -10, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
        <XAxis
          type="number"
          dataKey={xKey}
          name={xName}
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          domain={xDomain ?? ["auto", "auto"]}
          label={{ value: xName, position: "insideBottom", offset: -4, fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <YAxis
          type="number"
          dataKey={yKey}
          name={yName}
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          domain={yDomain ?? ["auto", "auto"]}
          width={34}
        />
        <ZAxis range={[60, 60]} />
        <Tooltip cursor={{ strokeDasharray: "3 3" }} content={<TooltipBox />} />
        <Scatter data={data} fill={color} fillOpacity={0.75} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

/** Radar across the six life areas. */
export function RadarScores({
  data,
  height = 280,
  color = "var(--primary)",
}: {
  data: { area: string; score: number }[];
  height?: number;
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke={GRID} />
        <PolarAngleAxis dataKey="area" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar dataKey="score" stroke={color} fill={color} fillOpacity={0.25} strokeWidth={2} />
        <Tooltip content={<TooltipBox />} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export { ReferenceLine, Cell };
