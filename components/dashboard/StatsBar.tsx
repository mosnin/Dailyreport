"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, BarChart3, CalendarDays } from "lucide-react";

export function StatsBar({ userId }: { userId: Id<"users"> }) {
  const stats = useQuery(api.users.getStats, { userId });

  if (!stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <StatCard
        icon={Flame}
        label="Current streak"
        value={`${stats.streak}d`}
        color="text-orange-500"
        bg="bg-orange-500/10"
      />
      <StatCard
        icon={BarChart3}
        label="Daily accuracy"
        value={`${stats.dailyAccuracy}%`}
        color="text-indigo-500"
        bg="bg-indigo-500/10"
      />
      <StatCard
        icon={CalendarDays}
        label="Weekly accuracy"
        value={`${stats.weeklyAccuracy}%`}
        color="text-green-500"
        bg="bg-green-500/10"
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  bg: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold leading-tight">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
