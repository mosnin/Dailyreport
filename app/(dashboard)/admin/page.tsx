"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useConvexUser } from "@/hooks/useConvexUser";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ShieldAlert, Search, Users, CreditCard, Crown, UserCheck } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────

type Plan = "free" | "pro" | "unlimited";
type Role = "user" | "admin";

type UserRow = {
  _id: Id<"users">;
  name: string;
  email: string;
  plan?: Plan;
  role?: Role;
  createdAt: number;
  creemSubscriptionId?: string;
};

// ── Plan badge ────────────────────────────────────────────────────────────

function PlanBadge({ plan }: { plan?: Plan }) {
  const p = plan ?? "free";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold",
        p === "unlimited"
          ? "bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300"
          : p === "pro"
          ? "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300"
          : "bg-muted text-muted-foreground"
      )}
    >
      {p === "unlimited" && <Crown className="w-3 h-3" />}
      {p === "pro" && <CreditCard className="w-3 h-3" />}
      {p.charAt(0).toUpperCase() + p.slice(1)}
    </span>
  );
}

function RoleBadge({ role }: { role?: Role }) {
  if (!role || role === "user") return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300">
      <ShieldAlert className="w-3 h-3" />
      Admin
    </span>
  );
}

// ── Plan selector ─────────────────────────────────────────────────────────

const PLAN_OPTIONS: { value: Plan; label: string }[] = [
  { value: "free", label: "Free" },
  { value: "pro", label: "Pro" },
  { value: "unlimited", label: "Unlimited" },
];

function PlanSelect({
  userId,
  current,
}: {
  userId: Id<"users">;
  current?: Plan;
}) {
  const adminUpdatePlan = useMutation(api.users.adminUpdatePlan);
  const [loading, setLoading] = useState(false);

  async function handleChange(plan: Plan) {
    if (plan === (current ?? "free")) return;
    setLoading(true);
    try {
      await adminUpdatePlan({ targetUserId: userId, plan });
      toast.success(`Plan updated to ${plan}`);
    } catch {
      toast.error("Failed to update plan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      {PLAN_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          disabled={loading}
          onClick={() => handleChange(opt.value)}
          className={cn(
            "px-2 py-1 rounded-lg text-[11px] font-medium transition-colors disabled:opacity-50",
            (current ?? "free") === opt.value
              ? opt.value === "unlimited"
                ? "bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300"
                : opt.value === "pro"
                ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
                : "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Admin toggle ──────────────────────────────────────────────────────────

function AdminToggle({
  userId,
  currentRole,
  selfId,
}: {
  userId: Id<"users">;
  currentRole?: Role;
  selfId: Id<"users">;
}) {
  const adminUpdateRole = useMutation(api.users.adminUpdateRole);
  const [loading, setLoading] = useState(false);
  const isAdmin = currentRole === "admin";
  const isSelf = userId === selfId;

  async function toggle() {
    if (isSelf) {
      toast.error("You cannot change your own admin status");
      return;
    }
    setLoading(true);
    try {
      await adminUpdateRole({ targetUserId: userId, role: isAdmin ? "user" : "admin" });
      toast.success(isAdmin ? "Admin removed" : "Admin granted");
    } catch {
      toast.error("Failed to update role");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading || isSelf}
      title={isSelf ? "Cannot change your own admin status" : isAdmin ? "Remove admin" : "Make admin"}
      className={cn(
        "p-1.5 rounded-lg transition-colors disabled:opacity-40",
        isAdmin
          ? "bg-rose-100 dark:bg-rose-950/50 text-rose-600 hover:bg-rose-200 dark:hover:bg-rose-900/50"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      <UserCheck className="w-4 h-4" />
    </button>
  );
}

// ── Stat tile ─────────────────────────────────────────────────────────────

function StatTile({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-5 py-4 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-3xl font-bold tabular-nums", accent)}>{value}</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { convexUserId, isLoading } = useConvexUser();
  const users = useQuery(api.users.listAll);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!users) return [];
    const q = search.trim().toLowerCase();
    if (!q) return users as UserRow[];
    return (users as UserRow[]).filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [users, search]);

  const stats = useMemo(() => {
    if (!users) return { total: 0, pro: 0, unlimited: 0, admins: 0 };
    const u = users as UserRow[];
    return {
      total: u.length,
      pro: u.filter((x) => x.plan === "pro").length,
      unlimited: u.filter((x) => x.plan === "unlimited").length,
      admins: u.filter((x) => x.role === "admin").length,
    };
  }, [users]);

  if (isLoading) {
    return (
      <div className="max-w-4xl space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // users === null means Convex returned null → not admin (or not loaded yet)
  if (users === null) {
    return (
      <div className="max-w-4xl">
        <div className="rounded-2xl border border-border bg-card p-12 text-center space-y-3">
          <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="font-semibold">Access denied</p>
          <p className="text-sm text-muted-foreground">
            This page is only accessible to administrators.
          </p>
        </div>
      </div>
    );
  }

  // Still loading (undefined = not yet resolved)
  if (users === undefined) {
    return (
      <div className="max-w-4xl space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2.5">
          <ShieldAlert className="w-6 h-6 text-rose-500" />
          Admin
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage users, plans, and access levels.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Total users" value={stats.total} />
        <StatTile label="Pro" value={stats.pro} accent="text-amber-600 dark:text-amber-400" />
        <StatTile label="Unlimited" value={stats.unlimited} accent="text-violet-600 dark:text-violet-400" />
        <StatTile label="Admins" value={stats.admins} accent="text-rose-600 dark:text-rose-400" />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* User list */}
      <div className="rounded-2xl border border-border overflow-hidden">
        {/* Table header */}
        <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 bg-muted/40 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <span>User</span>
          <span className="text-right">Plan</span>
          <span className="text-right">Role</span>
          <span className="text-right">Actions</span>
        </div>

        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {search ? "No users match your search." : "No users yet."}
          </div>
        )}

        {filtered.map((user, i) => (
          <div
            key={user._id}
            className={cn(
              "flex flex-col sm:grid sm:grid-cols-[1fr_auto_auto_auto] sm:items-center gap-3 sm:gap-4 px-5 py-4",
              i !== 0 && "border-t border-border"
            )}
          >
            {/* Identity */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>

            {/* Plan */}
            <div className="flex sm:justify-end">
              <PlanBadge plan={user.plan} />
            </div>

            {/* Role */}
            <div className="flex sm:justify-end min-w-[48px]">
              <RoleBadge role={user.role} />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 sm:justify-end">
              <PlanSelect userId={user._id} current={user.plan} />
              {convexUserId && (
                <AdminToggle
                  userId={user._id}
                  currentRole={user.role}
                  selfId={convexUserId}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {filtered.length} {filtered.length === 1 ? "user" : "users"} shown
          {search ? ` matching "${search}"` : ""}
        </p>
      )}
    </div>
  );
}
