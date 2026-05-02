"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export type ChartSpec = {
  type: "bar" | "line" | "pie" | "radar";
  title: string;
  description?: string;
  data: Record<string, unknown>[];
  xKey?: string;
  dataKeys?: string[];
  nameKey?: string;
  valueKey?: string;
  radarKeys?: string[];
  radarNameKey?: string;
};

const COLORS = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

export function ChartBlock({ chart }: { chart: ChartSpec }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 mt-3 space-y-1">
      <p className="text-sm font-semibold">{chart.title}</p>
      {chart.description && (
        <p className="text-xs text-muted-foreground">{chart.description}</p>
      )}
      <div className="pt-2">
        {chart.type === "bar" && chart.xKey && chart.dataKeys?.length ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chart.data} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey={chart.xKey} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              {chart.dataKeys.length > 1 && <Legend />}
              {chart.dataKeys.map((key, i) => (
                <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : chart.type === "line" && chart.xKey && chart.dataKeys?.length ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chart.data} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey={chart.xKey} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              {chart.dataKeys.length > 1 && <Legend />}
              {chart.dataKeys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : chart.type === "pie" && chart.nameKey && chart.valueKey ? (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={chart.data}
                dataKey={chart.valueKey}
                nameKey={chart.nameKey}
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={(entry) => `${(entry as unknown as Record<string, unknown>)[chart.nameKey!]} (${(entry as unknown as Record<string, unknown>)[chart.valueKey!]})`}
                labelLine={false}
              >
                {chart.data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : chart.type === "radar" && chart.radarNameKey && chart.radarKeys?.length ? (
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={chart.data} margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
              <PolarGrid />
              <PolarAngleAxis dataKey={chart.radarNameKey} tick={{ fontSize: 11 }} />
              {chart.radarKeys.map((key, i) => (
                <Radar
                  key={key}
                  name={key}
                  dataKey={key}
                  stroke={COLORS[i % COLORS.length]}
                  fill={COLORS[i % COLORS.length]}
                  fillOpacity={0.25}
                />
              ))}
              <Tooltip />
              {chart.radarKeys.length > 1 && <Legend />}
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Chart data unavailable.
          </p>
        )}
      </div>
    </div>
  );
}
