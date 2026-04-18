import { useEffect, useState } from "react";
import { File, GitCommit, Loader2, X } from "lucide-react";

import { useGitStore } from "../../stores/gitStore";
import type {
  GitFileStatus,
  GitHistoryEntry,
  GitStatusEntry,
} from "../../types/git";
import { formatRelativeTime } from "./HistoryPanel";
import { DiffPane } from "./DiffModal";

// ── Status label / badge helpers (mirror GitPanel) ────────────────────────────

const STATUS_LABEL: Partial<Record<GitFileStatus, string>> = {
  modified: "M",
  added: "A",
  untracked: "?",
  deleted: "D",
  renamed: "R",
  typechange: "T",
  conflicted: "C",
};

function statusBadgeClass(status: GitStatusEntry["status"]) {
  switch (status) {
    case "added":
    case "untracked":
      return "text-emerald-600 dark:text-emerald-400";
    case "deleted":
      return "text-rose-600 dark:text-rose-400";
    case "modified":
    case "renamed":
    case "typechange":
      return "text-amber-500 dark:text-amber-300";
    case "conflicted":
      return "text-red-500 dark:text-red-400";
    default:
      return "text-muted";
  }
}

// ── CommitDiffModal ───────────────────────────────────────────────────────────

export function CommitDiffModal({
  commit,
  onClose,
}: {
  readonly commit: GitHistoryEntry;
  readonly onClose: () => void;
}) {
  const [files, setFiles] = useState<GitStatusEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [patch, setPatch] = useState<string>("");
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [isLoadingPatch, setIsLoadingPatch] = useState(false);

  const fetchCommitFiles = useGitStore((s) => s.fetchCommitFiles);
  const fetchCommitFileDiff = useGitStore((s) => s.fetchCommitFileDiff);

  // Load file list on mount
  useEffect(() => {
    setIsLoadingFiles(true);
    void fetchCommitFiles(commit.hash)
      .then((entries) => {
        setFiles(entries);
        if (entries.length > 0) {
          setSelectedFile(entries[0].path);
        }
      })
      .finally(() => setIsLoadingFiles(false));
  }, [commit.hash, fetchCommitFiles]);

  // Load diff when selected file changes
  useEffect(() => {
    if (!selectedFile) return;
    setIsLoadingPatch(true);
    setPatch("");
    void fetchCommitFileDiff(commit.hash, selectedFile)
      .then(setPatch)
      .finally(() => setIsLoadingPatch(false));
  }, [commit.hash, selectedFile, fetchCommitFileDiff]);

  // Escape key to close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    globalThis.addEventListener("keydown", handleKey);
    return () => globalThis.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="flex h-[82vh] w-[84vw] flex-col overflow-hidden rounded-xl border border-border/30 bg-bg shadow-2xl">
        {/* ── Header ── */}
        <div className="flex shrink-0 items-center gap-2.5 border-b border-border/60 px-5 py-3">
          <GitCommit className="h-4 w-4 shrink-0 text-accent" />
          <span className="shrink-0 rounded bg-fg/[0.06] px-1.5 py-0.5 font-mono text-[11px] text-muted">
            {commit.hash.slice(0, 7)}
          </span>
          <span className="flex-1 truncate text-[13px] font-medium text-fg">
            {commit.message}
          </span>
          <span className="shrink-0 text-[11px] text-muted/70">
            {commit.author}
          </span>
          <span className="shrink-0 text-[11px] text-muted/50">
            {formatRelativeTime(commit.date)}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭提交查看器"
            className="ml-1 rounded-md p-1 text-muted transition hover:bg-fg/[0.06] hover:text-fg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Body: left file tree + right diff pane ── */}
        <div className="flex min-h-0 flex-1">
          {/* Left: file list */}
          <div className="flex w-56 shrink-0 flex-col overflow-auto border-r border-border/60 py-1.5">
            {isLoadingFiles ? (
              <div className="flex items-center gap-2 px-4 py-3 text-[12px] text-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                加载中…
              </div>
            ) : files.length === 0 ? (
              <p className="px-4 py-3 text-[12px] text-muted">无文件变更</p>
            ) : (
              files.map((f) => (
                <button
                  key={f.path}
                  type="button"
                  onClick={() => setSelectedFile(f.path)}
                  title={f.path}
                  className={[
                    "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] transition",
                    selectedFile === f.path
                      ? "bg-accent/10 text-fg"
                      : "text-fg/75 hover:bg-fg/[0.04] hover:text-fg",
                  ].join(" ")}
                >
                  <File className="h-3.5 w-3.5 shrink-0 text-muted/50" />
                  <span className="min-w-0 flex-1 truncate">
                    {f.path.split("/").pop() ?? f.path}
                  </span>
                  <span
                    className={[
                      "shrink-0 font-mono text-[10px] font-bold",
                      statusBadgeClass(f.status),
                    ].join(" ")}
                  >
                    {STATUS_LABEL[f.status] ?? "M"}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Right: diff content */}
          <div className="min-w-0 flex-1 overflow-hidden">
            {isLoadingPatch ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted/60" />
              </div>
            ) : (
              <DiffPane patch={patch} filePath={selectedFile ?? ""} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CommitDiffModal;
