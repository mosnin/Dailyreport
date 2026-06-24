"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useConvexUser } from "@/hooks/useConvexUser";
import { todayString, cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import { PageHeader } from "@/components/bento/PageHeader";
import { BentoCard } from "@/components/bento/BentoCard";
import { ScoreRing } from "@/components/bento/ScoreRing";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FolderKanban,
  ExternalLink,
  Archive,
  Trash2,
  RefreshCw,
  Plus,
} from "lucide-react";

const ACCENT = "var(--progress)";
const SECTION_LABEL =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60";
const INPUT =
  "w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

const STATUSES = ["planning", "active", "blocked", "done"] as const;
const STATUS_LABEL: Record<string, string> = {
  planning: "Planning",
  active: "Active",
  blocked: "Blocked",
  done: "Done",
};

type ConnectorPlatform = "clickup" | "trello";

function SourceChip({ source }: { source: string }) {
  const external = source === "clickup" || source === "trello";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
        external
          ? "text-[oklch(0.2_0.03_264)]"
          : "border border-border text-muted-foreground"
      )}
      style={external ? { background: ACCENT } : undefined}
    >
      {source}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

/** Connect / sync row for a single connector. */
function ConnectorRow({
  platform,
  label,
  connected,
  connectionId,
  userId,
}: {
  platform: ConnectorPlatform;
  label: string;
  connected: boolean;
  connectionId?: string;
  userId: Id<"users">;
}) {
  const syncFromConnector = useMutation(api.projects.syncFromConnector);
  const [busy, setBusy] = useState(false);

  async function handleConnect() {
    setBusy(true);
    try {
      const r = await fetch(
        `/api/integrations/connect?platform=${platform.toUpperCase()}`
      );
      const { redirectUrl } = await r.json();
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        toast.error(`Could not start ${label} connection`);
        setBusy(false);
      }
    } catch {
      toast.error(`Could not start ${label} connection`);
      setBusy(false);
    }
  }

  async function handleSync() {
    setBusy(true);
    try {
      const r = await fetch("/api/integrations/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, connectionId }),
      });
      const data = await r.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      const result = await syncFromConnector({
        userId,
        source: platform,
        projects: data.projects ?? [],
      });
      toast.success(
        `${label} synced — ${result.created} created, ${result.updated} updated`
      );
    } catch {
      toast.error(`Could not sync ${label}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2.5">
      <div className="flex items-center gap-2 min-w-0">
        <FolderKanban className="size-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium truncate">{label}</span>
        {connected && (
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold text-[oklch(0.2_0.03_264)]"
            style={{ background: ACCENT }}
          >
            Synced
          </span>
        )}
      </div>
      {connected ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={busy}
          className="rounded-lg gap-1.5"
        >
          <RefreshCw className={cn("size-3.5", busy && "animate-spin")} />
          {busy ? "Syncing…" : "Sync now"}
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={handleConnect}
          disabled={busy}
          className="rounded-lg text-[oklch(0.2_0.03_264)] font-semibold"
          style={{ background: ACCENT }}
        >
          {busy ? "…" : "Connect"}
        </Button>
      )}
    </div>
  );
}

/** Manual project create form. */
function CreateProjectCard({ userId }: { userId: Id<"users"> }) {
  const create = useMutation(api.projects.create);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("planning");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!title.trim()) {
      toast.error("Give your project a title");
      return;
    }
    setSaving(true);
    try {
      await create({
        userId,
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        dueDate: dueDate || undefined,
      });
      toast.success("Project created");
      setTitle("");
      setDescription("");
      setStatus("planning");
      setDueDate("");
    } catch {
      toast.error("Could not create project");
    } finally {
      setSaving(false);
    }
  }

  return (
    <BentoCard className="col-span-2 lg:col-span-2" delay={0.04}>
      <p className={SECTION_LABEL}>Track by hand</p>
      <h2 className="font-semibold mt-1 mb-4">New project</h2>
      <div className="space-y-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Project title"
          className={INPUT}
        />
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className={cn(INPUT, "resize-none")}
        />
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => {
            const selected = status === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  selected
                    ? "border-transparent text-[oklch(0.2_0.03_264)]"
                    : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                )}
                style={selected ? { background: ACCENT } : undefined}
              >
                {STATUS_LABEL[s]}
              </button>
            );
          })}
        </div>
        <label className="block space-y-1.5">
          <span className="text-xs text-muted-foreground">Due date (optional)</span>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={INPUT}
          />
        </label>
        <Button
          onClick={handleCreate}
          disabled={saving}
          className="w-full rounded-xl gap-1.5 text-[oklch(0.2_0.03_264)] font-semibold"
          style={{ background: ACCENT }}
        >
          <Plus className="size-4" />
          {saving ? "Creating…" : "Create"}
        </Button>
      </div>
    </BentoCard>
  );
}

/** Single project tile with ring + controls. */
function ProjectTile({
  project,
  delay,
}: {
  project: any;
  delay: number;
}) {
  const update = useMutation(api.projects.update);
  const remove = useMutation(api.projects.remove);
  const [busy, setBusy] = useState(false);

  async function handleArchive() {
    setBusy(true);
    try {
      await update({ projectId: project._id, archived: true });
      toast.success("Project archived");
    } catch {
      toast.error("Could not archive");
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await remove({ projectId: project._id });
      toast.success("Project deleted");
    } catch {
      toast.error("Could not delete");
      setBusy(false);
    }
  }

  return (
    <BentoCard className="col-span-2 lg:col-span-1" delay={delay}>
      <div className="flex items-start justify-between gap-2">
        <SourceChip source={project.source} />
        <div className="flex items-center gap-1">
          {project.externalUrl && (
            <a
              href={project.externalUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Open externally"
            >
              <ExternalLink className="size-3.5" />
            </a>
          )}
          <button
            type="button"
            onClick={handleArchive}
            disabled={busy}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            title="Archive"
          >
            <Archive className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-muted transition-colors disabled:opacity-50"
            title="Delete"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center my-3">
        <ScoreRing value={project.progress ?? 0} color={ACCENT} size={64} stroke={7}>
          <span className="text-xs font-bold numeral" style={{ color: ACCENT }}>
            {Math.round(project.progress ?? 0)}%
          </span>
        </ScoreRing>
      </div>

      <h3 className="font-semibold text-sm text-center truncate">{project.title}</h3>
      <div className="mt-2 flex items-center justify-center gap-2">
        <StatusBadge status={project.status} />
      </div>
      {project.dueDate && (
        <p className="mt-2 text-[11px] text-center text-muted-foreground">
          Due {project.dueDate}
        </p>
      )}
    </BentoCard>
  );
}

export default function ProjectsPage() {
  const { convexUserId } = useConvexUser();

  const projects = useQuery(
    api.projects.list,
    convexUserId ? { userId: convexUserId } : "skip"
  );
  const integrations = useQuery(
    api.integrations.getUserIntegrations,
    convexUserId ? { userId: convexUserId } : "skip"
  );

  const action = (
    <Link
      href="/reports/projects"
      className="inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold text-[oklch(0.2_0.03_264)]"
      style={{ background: ACCENT }}
    >
      Log progress
    </Link>
  );

  if (!convexUserId || projects === undefined) {
    return (
      <div className="space-y-4 pb-6">
        <PageHeader
          eyebrow="Life domain"
          title="Projects"
          subtitle="Everything you're building — synced or tracked by hand."
          action={action}
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Skeleton className="col-span-2 h-48 rounded-3xl" />
          <Skeleton className="col-span-2 h-48 rounded-3xl" />
          <Skeleton className="col-span-2 lg:col-span-4 h-40 rounded-3xl" />
        </div>
      </div>
    );
  }

  const integrationFor = (platform: string) =>
    (integrations as any[] | undefined)?.find((i) => i.platform === platform && i.connected);
  const isConnected = (platform: string) => !!integrationFor(platform);

  const visibleProjects = (projects as any[]).filter((p) => !p.archived);

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        eyebrow="Life domain"
        title="Projects"
        subtitle="Everything you're building — synced or tracked by hand."
        action={action}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Connect tools */}
        <BentoCard className="col-span-2 lg:col-span-2" delay={0.02}>
          <p className={SECTION_LABEL}>Connect tools</p>
          <h2 className="font-semibold mt-1 mb-1">Sync your project tools</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Sync projects from ClickUp or Trello and track their progress against
            your goals.
          </p>
          <div className="space-y-2">
            <ConnectorRow
              platform="clickup"
              label="ClickUp"
              connected={isConnected("clickup")}
              connectionId={integrationFor("clickup")?.composioConnectionId}
              userId={convexUserId}
            />
            <ConnectorRow
              platform="trello"
              label="Trello"
              connected={isConnected("trello")}
              connectionId={integrationFor("trello")?.composioConnectionId}
              userId={convexUserId}
            />
          </div>
        </BentoCard>

        {/* Manual create */}
        <CreateProjectCard userId={convexUserId} />

        {/* Projects grid */}
        {visibleProjects.length === 0 ? (
          <BentoCard className="col-span-2 lg:col-span-4 flex flex-col items-center justify-center text-center py-12">
            <FolderKanban className="size-7 text-muted-foreground mb-3" />
            <p className={SECTION_LABEL}>No projects yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Connect a tool above or create your first project by hand.
            </p>
          </BentoCard>
        ) : (
          visibleProjects.map((p, i) => (
            <ProjectTile key={p._id} project={p} delay={0.06 + i * 0.02} />
          ))
        )}
      </div>
    </div>
  );
}
