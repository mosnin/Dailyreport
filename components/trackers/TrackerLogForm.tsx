"use client";

import { cn } from "@/lib/utils";
import type { TrackerField } from "@/lib/trackers";

/** Renders a log form dynamically from a tracker's field definitions. */
export function TrackerLogForm({
  fields,
  values,
  onChange,
  accent,
}: {
  fields: TrackerField[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  accent: string;
}) {
  return (
    <div className="space-y-5">
      {fields.map((f) => (
        <div key={f.key}>
          <label className="mb-1.5 flex items-center justify-between text-sm font-medium">
            <span>
              {f.label}
              {f.unit && <span className="ml-1 text-xs text-muted-foreground">({f.unit})</span>}
            </span>
            {f.weight > 0 && <span className="text-[10px] uppercase tracking-wide text-muted-foreground/50">scored</span>}
          </label>

          {f.type === "boolean" ? (
            <div className="flex gap-2">
              {[true, false].map((b) => {
                const on = values[f.key] === b;
                return (
                  <button
                    key={String(b)}
                    type="button"
                    onClick={() => onChange(f.key, b)}
                    className={cn(
                      "flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                      on ? "border-transparent text-[oklch(0.16_0.02_264)]" : "border-border text-muted-foreground hover:text-foreground"
                    )}
                    style={on ? { background: accent } : undefined}
                  >
                    {b ? "Yes" : "No"}
                  </button>
                );
              })}
            </div>
          ) : f.type === "scale" ? (
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: (f.max ?? 10) - (f.min ?? 1) + 1 }).map((_, i) => {
                const val = (f.min ?? 1) + i;
                const on = Number(values[f.key]) === val;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => onChange(f.key, val)}
                    className={cn(
                      "h-9 w-9 rounded-lg border text-sm font-semibold transition-colors numeral",
                      on ? "border-transparent text-[oklch(0.16_0.02_264)]" : "border-border text-muted-foreground hover:text-foreground"
                    )}
                    style={on ? { background: accent } : undefined}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          ) : f.type === "text" ? (
            <textarea
              rows={2}
              value={values[f.key] ?? ""}
              onChange={(e) => onChange(f.key, e.target.value)}
              placeholder="Add a note..."
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          ) : (
            <input
              type="number"
              inputMode="decimal"
              value={values[f.key] ?? ""}
              onChange={(e) => onChange(f.key, e.target.value === "" ? "" : Number(e.target.value))}
              placeholder={f.target != null ? `target ${f.target}` : "0"}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring numeral"
            />
          )}
        </div>
      ))}
    </div>
  );
}
