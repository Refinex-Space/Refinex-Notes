import { CheckCircle2, CircleDashed, FileWarning, GitBranch } from "lucide-react";

import type { GitStatusEntry, GitSyncPhase } from "../../types/git";

function syncHeadline(syncStatus: GitSyncPhase, changedCount: number) {
  if (changedCount > 0) {
    return `${changedCount} 个变更待处理`;
  }

  switch (syncStatus) {
    case "synced":
      return "仓库已同步";
    case "conflicted":
      return "存在冲突";
    case "offline":
      return "Git 当前离线";
    default:
      return "仓库已连接";
  }
}

function statusIcon(syncStatus: GitSyncPhase, changedCount: number) {
  if (changedCount > 0) {
    return FileWarning;
  }

  return syncStatus === "synced" ? CheckCircle2 : CircleDashed;
}

function statusTone(syncStatus: GitSyncPhase, changedCount: number) {
  if (changedCount > 0) {
    return "text-amber-500";
  }

  return syncStatus === "synced" ? "text-emerald-500" : "text-muted";
}

function groupBadgeClassName(label: "Staged" | "Unstaged") {
  return label === "Staged"
    ? "border-emerald-300/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
    : "border-amber-300/30 bg-amber-500/10 text-amber-700 dark:text-amber-200";
}

function entryStatusClassName(status: GitStatusEntry["status"]) {
  switch (status) {
    case "added":
    case "untracked":
      return "border-emerald-300/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200";
    case "modified":
    case "renamed":
    case "typechange":
      return "border-amber-300/30 bg-amber-500/10 text-amber-700 dark:text-amber-200";
    case "deleted":
      return "border-rose-300/30 bg-rose-500/10 text-rose-700 dark:text-rose-200";
    case "conflicted":
      return "border-red-300/30 bg-red-500/12 text-red-700 dark:text-red-200";
    case "ignored":
    default:
      return "border-border/70 bg-[rgb(var(--color-bg)/0.72)] text-muted";
  }
}

export interface GitOverviewPanelProps {
  syncStatus: GitSyncPhase;
  syncDetail: string | null;
  changedFiles: GitStatusEntry[];
}

export function GitOverviewPanel({
  syncStatus,
  syncDetail,
  changedFiles,
}: GitOverviewPanelProps) {
  const Icon = statusIcon(syncStatus, changedFiles.length);
  const stagedFiles = changedFiles.filter((entry) => entry.staged);
  const unstagedFiles = changedFiles.filter((entry) => entry.unstaged);

  return (
    <div className="flex h-full min-h-0 flex-col justify-center p-5">
      <section className="mx-auto w-full max-w-sm text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.6rem] border border-border/60 bg-[rgb(var(--color-bg)/0.82)] shadow-[0_16px_40px_rgba(148,163,184,0.06)]">
          <Icon className={["h-7 w-7", statusTone(syncStatus, changedFiles.length)].join(" ")} />
        </div>

        <div className="mt-6 space-y-2">
          <h3 className="text-[1.05rem] font-semibold tracking-tight text-fg">
            {syncHeadline(syncStatus, changedFiles.length)}
          </h3>
          <p className="text-sm leading-6 text-muted">
            {syncDetail ?? "打开一个文件查看提交历史，或直接在这里关注工作区变更。"}
          </p>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-border/60 bg-[rgb(var(--color-bg)/0.72)] p-3 text-left">
          <div className="flex items-center gap-2 px-1">
            <GitBranch className="h-4 w-4 text-accent" />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Changes
            </p>
          </div>

          {changedFiles.length === 0 ? (
            <p className="px-1 pb-1 pt-3 text-sm leading-6 text-muted">
              当前工作区没有待处理变更。
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {[
                { label: "Staged" as const, entries: stagedFiles },
                { label: "Unstaged" as const, entries: unstagedFiles },
              ]
                .filter((group) => group.entries.length > 0)
                .map((group) => (
                  <section key={group.label} className="space-y-1.5">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                        {group.label}
                      </p>
                      <span
                        className={[
                          "inline-flex h-5 min-w-[1.4rem] items-center justify-center rounded-full border px-1.5 text-[10px] font-semibold",
                          groupBadgeClassName(group.label),
                        ].join(" ")}
                      >
                        {group.entries.length}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {group.entries.slice(0, 4).map((entry) => (
                        <div
                          key={`${group.label}:${entry.path}:${entry.status}`}
                          className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm"
                        >
                          <span className="truncate text-fg">{entry.path}</span>
                          <span
                            className={[
                              "shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                              entryStatusClassName(entry.status),
                            ].join(" ")}
                          >
                            {entry.status}
                          </span>
                        </div>
                      ))}
                      {group.entries.length > 4 ? (
                        <p className="px-3 pt-0.5 text-xs text-muted">
                          还有 {group.entries.length - 4} 项未显示
                        </p>
                      ) : null}
                    </div>
                  </section>
                ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default GitOverviewPanel;
