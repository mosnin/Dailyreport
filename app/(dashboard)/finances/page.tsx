"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useConvexUser } from "@/hooks/useConvexUser";
import { todayString, cn } from "@/lib/utils";
import { toast } from "sonner";
import { PageHeader } from "@/components/bento/PageHeader";
import { BentoCard } from "@/components/bento/BentoCard";
import { ScoreRing } from "@/components/bento/ScoreRing";
import { LineTrend, AreaTrend } from "@/components/charts/Charts";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const ACCENT = "var(--finance)";
const SECTION_LABEL =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60";
const INPUT =
  "w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

function NotEnoughData() {
  return (
    <p className="text-sm text-muted-foreground/70 py-8 text-center">
      Not enough data yet
    </p>
  );
}

/** Parse a text input → number | undefined (empty/invalid → undefined). */
function parseNum(v: string): number | undefined {
  const t = v.trim();
  if (t === "") return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

/** Pull the most recent non-null value of a metric from ASC-sorted rows. */
function latestOf(rows: any[], key: string): number | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    const v = rows[i]?.[key];
    if (typeof v === "number") return v;
  }
  return null;
}

/** Inline 1–10 stress selector. */
function Scale({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
        const active = value === n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(active ? null : n)}
            className={cn(
              "h-9 w-9 rounded-lg border text-sm font-semibold numeral transition-colors",
              active
                ? "border-transparent text-[oklch(0.2_0.03_264)]"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
            style={active ? { background: ACCENT } : undefined}
            aria-pressed={active}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}

function StatTile({
  label,
  value,
  suffix,
  delay,
}: {
  label: string;
  value: string;
  suffix?: string;
  delay?: number;
}) {
  return (
    <BentoCard className="flex flex-col justify-between" delay={delay}>
      <p className={SECTION_LABEL}>{label}</p>
      <p className="text-2xl font-bold numeral mt-3">
        {value}
        {suffix && (
          <span className="text-sm font-medium text-muted-foreground ml-1">
            {suffix}
          </span>
        )}
      </p>
    </BentoCard>
  );
}

export default function FinancesPage() {
  const { convexUserId } = useConvexUser();
  const today = todayString();

  const todayLog = useQuery(
    api.finances.getForDate,
    convexUserId ? { userId: convexUserId, date: today } : "skip"
  ) as any | null | undefined;

  const rows = useQuery(
    api.finances.getRecent,
    convexUserId ? { userId: convexUserId, days: 90 } : "skip"
  ) as any[] | undefined;

  const lifeScore = useQuery(
    api.lifeScore.getCurrent,
    convexUserId ? { userId: convexUserId, windowDays: 90 } : "skip"
  );

  const upsert = useMutation(api.finances.upsert);

  // Form state.
  const [income, setIncome] = useState("");
  const [spending, setSpending] = useState("");
  const [saved, setSaved] = useState("");
  const [netWorth, setNetWorth] = useState("");
  const [stress, setStress] = useState<number | null>(null);
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  // Prefill once today's log resolves.
  useEffect(() => {
    if (prefilled || todayLog === undefined) return;
    if (todayLog) {
      setIncome(todayLog.income != null ? String(todayLog.income) : "");
      setSpending(todayLog.spending != null ? String(todayLog.spending) : "");
      setSaved(todayLog.saved != null ? String(todayLog.saved) : "");
      setNetWorth(todayLog.netWorth != null ? String(todayLog.netWorth) : "");
      setStress(
        typeof todayLog.financialStress === "number"
          ? todayLog.financialStress
          : null
      );
      setCategory(todayLog.category ?? "");
      setNotes(todayLog.notes ?? "");
    }
    setPrefilled(true);
  }, [todayLog, prefilled]);

  async function handleSubmit() {
    if (!convexUserId) return;
    setSaving(true);
    try {
      await upsert({
        userId: convexUserId,
        date: today,
        income: parseNum(income),
        spending: parseNum(spending),
        saved: parseNum(saved),
        netWorth: parseNum(netWorth),
        financialStress: stress ?? undefined,
        category: category.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success("Money logged");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save check-in");
    } finally {
      setSaving(false);
    }
  }

  const header = (
    <PageHeader
      eyebrow="Life domain"
      title="Finances"
      subtitle="Savings rate, spending discipline, and money stress over time."
    />
  );

  // Loading.
  if (!convexUserId || rows === undefined) {
    return (
      <div className="space-y-4 pb-6">
        {header}
        <Skeleton className="h-96 rounded-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Skeleton className="col-span-2 lg:col-span-1 h-44 rounded-3xl" />
          <Skeleton className="h-44 rounded-3xl" />
          <Skeleton className="h-44 rounded-3xl" />
          <Skeleton className="h-44 rounded-3xl" />
        </div>
      </div>
    );
  }

  const financeArea: any = (lifeScore as any)?.areas?.find(
    (a: any) => a.key === "finance"
  );
  const hasScore = !!financeArea && !financeArea.needsData;

  const latestIncome = latestOf(rows, "income");
  const latestSpending = latestOf(rows, "spending");
  const latestNetWorth = latestOf(rows, "netWorth");

  // Latest savings rate from most recent row with usable income.
  let savingsRate: number | null = null;
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i];
    if (typeof r.income === "number" && r.income > 0) {
      const savedVal =
        typeof r.saved === "number"
          ? r.saved
          : r.income - (typeof r.spending === "number" ? r.spending : 0);
      savingsRate = Math.round((savedVal / r.income) * 100);
      break;
    }
  }

  const chartData = rows.map((r) => ({
    label: new Date(r.date + "T12:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    netWorth: r.netWorth,
    income: r.income,
    spending: r.spending,
    savingsRate:
      r.income && r.income > 0
        ? Math.round(
            ((r.saved ?? r.income - (r.spending ?? 0)) / r.income) * 100
          )
        : null,
  }));

  const netWorthData = chartData.filter(
    (d) => typeof d.netWorth === "number"
  );
  const incomeSpendData = chartData.filter(
    (d) => typeof d.income === "number" || typeof d.spending === "number"
  );
  const savingsRateData = chartData.filter(
    (d) => typeof d.savingsRate === "number"
  );

  const maxNetWorth = Math.max(
    0,
    ...rows.map((r) => (typeof r.netWorth === "number" ? r.netWorth : 0))
  );
  const maxIncomeSpend = Math.max(
    0,
    ...rows.map((r) => (typeof r.income === "number" ? r.income : 0)),
    ...rows.map((r) => (typeof r.spending === "number" ? r.spending : 0))
  );

  const hasAnyLogs = rows.length > 0;

  const form = (
    <BentoCard delay={0.02}>
      <p className={SECTION_LABEL}>Today</p>
      <h2 className="font-semibold mt-1 mb-4">Money check-in</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Income
          </label>
          <input
            type="number"
            inputMode="decimal"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            placeholder="0"
            className={INPUT}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Spending
          </label>
          <input
            type="number"
            inputMode="decimal"
            value={spending}
            onChange={(e) => setSpending(e.target.value)}
            placeholder="0"
            className={INPUT}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Saved
          </label>
          <input
            type="number"
            inputMode="decimal"
            value={saved}
            onChange={(e) => setSaved(e.target.value)}
            placeholder="auto = income − spending"
            className={INPUT}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Net worth{" "}
            <span className="text-muted-foreground/60">(optional)</span>
          </label>
          <input
            type="number"
            inputMode="decimal"
            value={netWorth}
            onChange={(e) => setNetWorth(e.target.value)}
            placeholder="0"
            className={INPUT}
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-xs font-medium text-muted-foreground mb-2">
          Financial stress{" "}
          <span className="text-muted-foreground/60">(1 = calm, 10 = high)</span>
        </label>
        <Scale value={stress} onChange={setStress} />
      </div>

      <div className="mt-4">
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
          Category{" "}
          <span className="text-muted-foreground/60">(optional)</span>
        </label>
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g. monthly, weekly"
          className={INPUT}
        />
      </div>

      <div className="mt-4">
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Anything worth remembering about your money today…"
          className={cn(INPUT, "resize-none")}
        />
      </div>

      <div className="mt-5">
        <Button
          onClick={handleSubmit}
          disabled={saving}
          style={{ background: ACCENT, color: "oklch(0.2 0.03 264)" }}
        >
          {saving ? "Saving…" : "Save check-in"}
        </Button>
      </div>
    </BentoCard>
  );

  return (
    <div className="space-y-4 pb-6">
      {header}

      {/* Check-in form */}
      {form}

      {/* Top stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <BentoCard
          className="col-span-2 lg:col-span-1 flex flex-col items-center justify-center text-center"
          delay={0.04}
        >
          <p className={SECTION_LABEL}>Finance score</p>
          {hasScore ? (
            <div className="my-3">
              <ScoreRing value={financeArea.score} color={ACCENT} size={112}>
                <div className="text-center">
                  <p
                    className="text-2xl font-bold numeral"
                    style={{ color: ACCENT }}
                  >
                    {Math.round(financeArea.score)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">/ 100</p>
                </div>
              </ScoreRing>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-4">
              Log more days to unlock your score.
            </p>
          )}
        </BentoCard>

        <StatTile
          label="Savings rate"
          value={savingsRate != null ? String(savingsRate) : "—"}
          suffix={savingsRate != null ? "%" : undefined}
          delay={0.06}
        />
        <StatTile
          label="Net worth"
          value={
            latestNetWorth != null ? latestNetWorth.toLocaleString() : "—"
          }
          delay={0.08}
        />
        <StatTile
          label="Monthly spending"
          value={
            latestSpending != null ? latestSpending.toLocaleString() : "—"
          }
          delay={0.1}
        />
      </div>

      {/* Empty hint when no logs */}
      {!hasAnyLogs && (
        <BentoCard className="flex flex-col items-center justify-center text-center py-12 gap-3">
          <p className="text-base font-semibold">No finance logs yet</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Use the money check-in above to log income, spending and savings.
            Your trends and score will build over time.
          </p>
        </BentoCard>
      )}

      {/* Charts */}
      {hasAnyLogs && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {netWorthData.length > 0 && (
            <BentoCard className="col-span-2 lg:col-span-2" delay={0.12}>
              <p className={SECTION_LABEL}>Net worth</p>
              <h2 className="font-semibold mt-1 mb-3">Over time</h2>
              {netWorthData.length >= 2 ? (
                <AreaTrend
                  data={netWorthData}
                  dataKey="netWorth"
                  name="Net worth"
                  color={ACCENT}
                  domain={[0, Math.max(1, maxNetWorth)]}
                />
              ) : (
                <NotEnoughData />
              )}
            </BentoCard>
          )}

          <BentoCard className="col-span-2 lg:col-span-2" delay={0.14}>
            <p className={SECTION_LABEL}>Cash flow</p>
            <h2 className="font-semibold mt-1 mb-3">Income vs spending</h2>
            {incomeSpendData.length >= 2 ? (
              <LineTrend
                data={incomeSpendData}
                series={[
                  { key: "income", name: "Income", color: "var(--health)" },
                  {
                    key: "spending",
                    name: "Spending",
                    color: "var(--emotional)",
                  },
                ]}
                domain={[0, Math.max(1, maxIncomeSpend)]}
              />
            ) : (
              <NotEnoughData />
            )}
          </BentoCard>

          <BentoCard className="col-span-2 lg:col-span-2" delay={0.16}>
            <p className={SECTION_LABEL}>Discipline</p>
            <h2 className="font-semibold mt-1 mb-3">Savings rate</h2>
            {savingsRateData.length >= 2 ? (
              <AreaTrend
                data={savingsRateData}
                dataKey="savingsRate"
                name="Savings rate"
                color={ACCENT}
                domain={[0, 100]}
                suffix="%"
              />
            ) : (
              <NotEnoughData />
            )}
          </BentoCard>
        </div>
      )}
    </div>
  );
}
