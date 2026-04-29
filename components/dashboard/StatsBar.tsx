"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, BarChart3, Calendar } from "lucide-react";

export function StatsBar({ userId }: { userId: Id<"users"> }) {
  const stats = useQuery(api.users.getStats, { userId });

  if (!stats) {
    return (
      <div className="grid grid-cols-3 gap-4">
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
    <div className="grid grid-cols-3 gap-4">
      <StatCard
        icon={Flame}
        label="Current streak"
        value={`${stats.streak}d`}
        color="text-orange-500"
      />
      <StatCard
        icon={BarChart3}
        label="Daily accuracy"
        value={`${stats.dailyAccuracy}%`}
        color="text-indigo-500"
      />
      <StatCard
        icon={Calendar}
        label="Weekly accuracy"
        value={`${stats.weeklyAccuracy}%`}
        color="text-green-500"
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex flex-col gap-1">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className="text-xs font-medium">{label}</span>
        </div>
        <span className="text-2xl font-bold">{value}</span>
      </CardContent>
    </Card>
  );
}
