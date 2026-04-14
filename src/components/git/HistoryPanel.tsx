import { useEffect } from "react";
import { Clock3, FileClock, GitCommitHorizontal } from "lucide-react";

import { useGitStore } from "../../stores/gitStore";

export interface HistoryPanelProps {
  currentFile: string | null;
}

export function formatRelativeTime(timestamp: number, now = Date.now()) {
  const diffSeconds = Math.round((timestamp * 1000 - now) / 1000);
  const formatter = new Intl.RelativeTimeFormat("zh-CN", { numeric: "auto" });

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
    ["second", 1],
  ];

  for (const [unit, size] of units) {
    if (Math.abs(diffSeconds) >= size || unit === "second") {
      return formatter.format(Math.round(diffSeconds / size), unit);
    }
  }

  return "刚刚";
}

export function HistoryPanel({ currentFile }: HistoryPanelProps) {
  const history = useGitStore((state) => state.history);
  const isLoadingHistory = useGitStore((state) => state.isLoadingHistory);
  const selectedCommitHash = useGitStore((state) => state.selectedCommitHash);
  const selectedCommitDiff = useGitStore((state) => state.selectedCommitDiff);
  const getHistory = useGitStore((state) => state.getHistory);
  const selectHistoryEntry = useGitStore((state) => state.selectHistoryEntry);
  const errorMessage = useGitStore((state) => state.errorMessage);

  useEffect(() => {
    if (!currentFile) {
      return;
    }
    void getHistory(currentFile);
  }, [currentFile, getHistory]);

  useEffect(() => {
    if (!selectedCommitHash || selectedCommitDiff !== null) {
      return;
    }
    void selectHistoryEntry(selectedCommitHash);
  }, [selectedCommitDiff, selectedCommitHash, selectHistoryEntry]);

  if (!currentFile) {
    return (
      <div className="flex h-full items-center justify-center p-5 text-sm text-muted">
        先从文件树中打开一篇 Markdown，右侧才会显示对应的提交历史。
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <FileClock className="h-4 w-4 text-accent" />
          <div>
            <p className="text-sm font-semibold text-fg">版本历史</p>
            <p className="text-xs text-muted">{currentFile}</p>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="min-h-0 overflow-auto border-b border-border/70 px-3 py-3">
          {isLoadingHistory && history.length === 0 ? (
            <p className="text-sm text-muted">正在读取提交历史…</p>
          ) : history.length === 0 ? (
            <p className="text-sm leading-6 text-muted">
              当前文件还没有可展示的提交历史。
            </p>
          ) : (
            <div className="space-y-2">
              {history.map((entry) => (
                <button
                  key={entry.hash}
                  type="button"
                  className={[
                    "flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition",
                    selectedCommitHash === entry.hash
                      ? "border-accent/35 bg-accent/10"
                      : "border-border/70 bg-white/[0.03] hover:border-accent/25 hover:bg-white/[0.05]",
                  ].join(" ")}
                  onClick={() => {
                    void selectHistoryEntry(entry.hash);
                  }}
                >
                  <div className="mt-0.5 rounded-full border border-white/10 bg-white/[0.04] p-1.5 text-fg/70">
                    <GitCommitHorizontal className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-fg">
                      {entry.message}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span>{entry.author}</span>
                      <span className="text-border">•</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3 w-3" />
                        {formatRelativeTime(entry.date)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="min-h-0 overflow-auto px-4 py-3">
          <div className="mb-2 flex items-center gap-2">
            <GitCommitHorizontal className="h-4 w-4 text-accent" />
            <p className="text-sm font-semibold text-fg">只读历史快照</p>
          </div>
          <p className="mb-3 text-xs leading-5 text-muted">
            当前原生层提供的是 commit patch 预览，因此这里展示的是该提交的只读变更内容。
          </p>
          {errorMessage ? (
            <p className="mb-3 rounded-2xl border border-rose-300/40 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-300/15 dark:bg-rose-400/10 dark:text-rose-100">
              {errorMessage}
            </p>
          ) : null}
          <pre className="min-h-[240px] overflow-auto rounded-3xl border border-border/70 bg-slate-50 p-4 text-xs leading-6 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:bg-slate-950/90 dark:text-slate-100 dark:shadow-none">
            {selectedCommitDiff ?? "选择一条提交以查看只读快照。"}
          </pre>
        </div>
      </div>
    </div>
  );
}
