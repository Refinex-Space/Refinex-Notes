import type React from "react";
import { useEffect, useState } from "react";
import {
  ArrowUpToLine,
  File,
  GitBranch,
  Minus,
  Plus,
  RefreshCcw,
} from "lucide-react";

import { useGitStore } from "../../stores/gitStore";
import type {
  GitFileStatus,
  GitHistoryEntry,
  GitStatusEntry,
} from "../../types/git";
import { formatRelativeTime } from "./HistoryPanel";
import { DiffModal } from "./DiffModal";
import { CommitDiffModal } from "./CommitDiffModal";

type PanelTab = "changes" | "history";

// ── Status badge helpers ──────────────────────────────────────────────────────

const STATUS_LABEL: Partial<Record<GitFileStatus, string>> = {
  modified: "已修改",
  added: "新增",
  untracked: "未追踪",
  deleted: "已删除",
  renamed: "已重命名",
  typechange: "类型变更",
  conflicted: "冲突",
};

function statusBadgeClassName(status: GitStatusEntry["status"]) {
  switch (status) {
    case "added":
    case "untracked":
      return "text-emerald-600 dark:text-emerald-300";
    case "modified":
    case "renamed":
    case "typechange":
      return "text-amber-600 dark:text-amber-300";
    case "deleted":
      return "text-rose-600 dark:text-rose-300";
    case "conflicted":
      return "text-red-600 dark:text-red-300";
    default:
      return "text-muted";
  }
}

// ── File item row ─────────────────────────────────────────────────────────────

function FileRow({
  entry,
  section,
  onStage,
  onUnstage,
  onOpenDiff,
}: {
  readonly entry: GitStatusEntry;
  readonly section: "staged" | "unstaged" | "all";
  readonly onStage?: () => void;
  readonly onUnstage?: () => void;
  readonly onOpenDiff: () => void;
}) {
  const label = STATUS_LABEL[entry.status] ?? entry.status;
  const filename = entry.path.split("/").pop() ?? entry.path;

  // Staging action button (shown on row hover)
  let stagingButton: React.ReactNode = null;
  if (section === "staged" && onUnstage) {
    stagingButton = (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onUnstage();
        }}
        title="取消暂存"
        aria-label="取消暂存"
        className="invisible shrink-0 rounded p-0.5 text-muted/60 transition hover:bg-rose-500/15 hover:text-rose-500 group-hover:visible"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
    );
  } else if (onStage) {
    stagingButton = (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onStage();
        }}
        title="暂存此文件"
        aria-label="暂存此文件"
        className="invisible shrink-0 rounded p-0.5 text-muted/60 transition hover:bg-accent/15 hover:text-accent group-hover:visible"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <div className="group flex items-center rounded-md hover:bg-fg/[0.05]">
      <button
        type="button"
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-md px-2 py-[3px]"
        title={entry.path}
        onClick={onOpenDiff}
      >
        <File className="h-3.5 w-3.5 shrink-0 text-muted/60" />
        <span className="flex-1 truncate text-[12.5px] text-fg">
          {filename}
        </span>
        <span
          className={[
            "shrink-0 text-[11px] font-semibold",
            statusBadgeClassName(entry.status),
          ].join(" ")}
        >
          {label}
        </span>
      </button>
      {stagingButton ? (
        <div className="shrink-0 pr-1.5">{stagingButton}</div>
      ) : null}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({
  label,
  count,
  action,
}: {
  readonly label: string;
  readonly count: number;
  readonly action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex items-center gap-2 px-2 pb-1 pt-3">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
        {label}
      </span>
      <span className="inline-flex h-4 min-w-[1.1rem] items-center justify-center rounded-full bg-fg/[0.07] px-1 text-[10px] font-semibold text-muted">
        {count}
      </span>
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="ml-auto text-[10.5px] text-muted/60 transition hover:text-accent"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

// ── History tab content (extracted to avoid nested ternary) ──────────────────

function HistoryContent({
  isLoadingRepoHistory,
  repoHistory,
  onOpenCommit,
}: {
  readonly isLoadingRepoHistory: boolean;
  readonly repoHistory: GitHistoryEntry[];
  readonly onOpenCommit: (entry: GitHistoryEntry) => void;
}) {
  if (isLoadingRepoHistory && repoHistory.length === 0) {
    return (
      <div className="flex h-full items-center justify-center py-10">
        <p className="text-[12.5px] text-muted">正在读取提交记录…</p>
      </div>
    );
  }

  if (repoHistory.length === 0) {
    return (
      <div className="flex h-full items-center justify-center py-10">
        <p className="text-[12.5px] leading-6 text-muted">
          当前仓库还没有提交记录。
        </p>
      </div>
    );
  }

  return (
    <div>
      {repoHistory.map((entry, index) => (
        <button
          key={entry.hash}
          type="button"
          onClick={() => onOpenCommit(entry)}
          className={[
            "w-full cursor-pointer px-3 py-2.5 text-left hover:bg-fg/[0.04]",
            index < repoHistory.length - 1 ? "border-b border-border/60" : "",
          ].join(" ")}
        >
          <p className="truncate text-[12.5px] font-medium text-fg">
            {entry.message}
          </p>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="font-mono text-[11px] text-muted/60">
              {entry.hash.slice(0, 7)}
            </span>
            <span className="text-[11px] text-muted/60">
              {formatRelativeTime(entry.date)}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

// ── GitPanel ──────────────────────────────────────────────────────────────────

export function GitPanel() {
  const [activeTab, setActiveTab] = useState<PanelTab>("changes");
  const [commitMessage, setCommitMessage] = useState("");
  const [diffState, setDiffState] = useState<{
    filePath: string;
    patch: string;
  } | null>(null);
  const [isLoadingDiff, setIsLoadingDiff] = useState(false);
  const [historyCommit, setHistoryCommit] = useState<GitHistoryEntry | null>(
    null,
  );

  const changedFiles = useGitStore((s) => s.changedFiles);
  const repoHistory = useGitStore((s) => s.repoHistory);
  const currentBranch = useGitStore((s) => s.currentBranch);
  const isRunningAction = useGitStore((s) => s.isRunningAction);
  const isLoadingRepoHistory = useGitStore((s) => s.isLoadingRepoHistory);
  const commitStaged = useGitStore((s) => s.commitStaged);
  const push = useGitStore((s) => s.push);
  const getRepoHistory = useGitStore((s) => s.getRepoHistory);
  const stageFile = useGitStore((s) => s.stageFile);
  const unstageFile = useGitStore((s) => s.unstageFile);
  const stageAll = useGitStore((s) => s.stageAll);
  const fetchWorkingDiff = useGitStore((s) => s.fetchWorkingDiff);

  const stagedFiles = changedFiles.filter((f) => f.staged);
  const unstagedFiles = changedFiles.filter((f) => f.unstaged && !f.staged);

  // Fetch history when switching to history tab
  useEffect(() => {
    if (activeTab === "history") {
      void getRepoHistory();
    }
  }, [activeTab, getRepoHistory]);

  const handleCommit = () => {
    const trimmed = commitMessage.trim();
    if (!trimmed || isRunningAction) return;
    void commitStaged(trimmed).then(() => {
      setCommitMessage("");
    });
  };

  const handlePush = () => {
    if (isRunningAction) return;
    void push();
  };

  const handleOpenDiff = (entry: GitStatusEntry): void => {
    if (isLoadingDiff) return;
    setIsLoadingDiff(true);
    void fetchWorkingDiff(entry.path)
      .then((patch) => {
        setDiffState({ filePath: entry.path, patch });
      })
      .catch(() => {
        setDiffState({ filePath: entry.path, patch: "" });
      })
      .finally(() => {
        setIsLoadingDiff(false);
      });
  };

  const canCommit =
    commitMessage.trim().length > 0 &&
    stagedFiles.length > 0 &&
    !isRunningAction;

  // ── Tab style ───────────────────────────────────────────────────────────────

  const tabClass = (tab: PanelTab) =>
    [
      "flex-1 py-[7px] text-[12px] font-medium border-none bg-transparent cursor-pointer font-sans",
      "transition-colors duration-100",
      activeTab === tab
        ? "text-accent border-b-2 border-accent"
        : "text-muted border-b-2 border-transparent hover:text-fg",
    ].join(" ");

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ── Diff viewer modal ── */}
      {diffState ? (
        <DiffModal
          filePath={diffState.filePath}
          patch={diffState.patch}
          onClose={() => setDiffState(null)}
        />
      ) : null}

      {/* ── Commit diff modal ── */}
      {historyCommit ? (
        <CommitDiffModal
          commit={historyCommit}
          onClose={() => setHistoryCommit(null)}
        />
      ) : null}

      {/* ── Header with branch badge ── */}
      <div className="flex items-center gap-2 border-b border-border/70 px-3 py-2.5">
        <GitBranch className="h-4 w-4 text-accent" />
        <span className="text-[13px] font-semibold text-fg">Git</span>
        {currentBranch ? (
          <span className="rounded-[10px] border border-border/60 bg-fg/[0.05] px-2 py-0.5 text-[11px] text-muted">
            {currentBranch}
          </span>
        ) : null}
      </div>

      {/* ── Tab switcher ── */}
      <div className="flex border-b border-border/70">
        <button
          type="button"
          className={tabClass("changes")}
          onClick={() => setActiveTab("changes")}
        >
          变更{changedFiles.length > 0 ? ` (${changedFiles.length})` : ""}
        </button>
        <button
          type="button"
          className={tabClass("history")}
          onClick={() => setActiveTab("history")}
        >
          历史
        </button>
      </div>

      {/* ── Tab content ── */}
      {activeTab === "changes" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Scrollable file lists */}
          <div className="min-h-0 flex-1 overflow-auto px-1.5 pb-2">
            {changedFiles.length === 0 ? (
              <div className="flex h-full items-center justify-center py-10">
                <p className="text-center text-[12.5px] leading-6 text-muted">
                  当前工作区没有待处理变更。
                </p>
              </div>
            ) : (
              <>
                {stagedFiles.length > 0 && (
                  <section>
                    <SectionHeader label="已暂存" count={stagedFiles.length} />
                    {stagedFiles.map((entry) => (
                      <FileRow
                        key={`staged:${entry.path}`}
                        entry={entry}
                        section="staged"
                        onUnstage={() => void unstageFile(entry.path)}
                        onOpenDiff={() => handleOpenDiff(entry)}
                      />
                    ))}
                  </section>
                )}

                {unstagedFiles.length > 0 && (
                  <section>
                    <SectionHeader
                      label="未暂存"
                      count={unstagedFiles.length}
                      action={
                        unstagedFiles.length > 1
                          ? {
                              label: "暂存全部",
                              onClick: () => void stageAll(),
                            }
                          : undefined
                      }
                    />
                    {unstagedFiles.map((entry) => (
                      <FileRow
                        key={`unstaged:${entry.path}`}
                        entry={entry}
                        section="unstaged"
                        onStage={() => void stageFile(entry.path)}
                        onOpenDiff={() => handleOpenDiff(entry)}
                      />
                    ))}
                  </section>
                )}

                {/* Edge case: files that appear in both staged & unstaged sections */}
                {changedFiles.some((f) => f.staged && f.unstaged) &&
                  stagedFiles.length === 0 &&
                  unstagedFiles.length === 0 && (
                    <section>
                      <SectionHeader
                        label="变更"
                        count={changedFiles.length}
                        action={
                          changedFiles.length > 1
                            ? {
                                label: "暂存全部",
                                onClick: () => void stageAll(),
                              }
                            : undefined
                        }
                      />
                      {changedFiles.map((entry) => (
                        <FileRow
                          key={entry.path}
                          entry={entry}
                          section="all"
                          onStage={() => void stageFile(entry.path)}
                          onOpenDiff={() => handleOpenDiff(entry)}
                        />
                      ))}
                    </section>
                  )}
              </>
            )}
          </div>

          {/* ── Commit area ── */}
          <div className="border-t border-border/70 p-3">
            <textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleCommit();
                }
              }}
              placeholder="提交信息..."
              rows={2}
              className="w-full resize-none rounded-lg border border-border/60 bg-bg px-2.5 py-2 text-[12.5px] text-fg placeholder:text-muted/60 outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/25"
            />
            {changedFiles.length > 0 && stagedFiles.length === 0 && (
              <p className="mt-1 text-[11px] text-muted/60">
                点击文件行右侧的 + 暂存后才能提交
              </p>
            )}
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={!canCommit}
                onClick={handleCommit}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent py-[7px] text-[12px] font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isRunningAction ? (
                  <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    提交
                    {stagedFiles.length > 0 && (
                      <span className="opacity-70">({stagedFiles.length})</span>
                    )}
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={isRunningAction}
                onClick={handlePush}
                title="推送到远端"
                aria-label="推送到远端"
                className="flex items-center justify-center gap-1.5 rounded-lg border border-border/60 px-3 py-[7px] text-[12px] text-muted transition hover:border-accent/40 hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowUpToLine className="h-3.5 w-3.5" />
                推送
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ── History tab ── */
        <div className="min-h-0 flex-1 overflow-auto">
          {HistoryContent({
            isLoadingRepoHistory,
            repoHistory,
            onOpenCommit: (entry) => setHistoryCommit(entry),
          })}
        </div>
      )}
    </div>
  );
}

export default GitPanel;
