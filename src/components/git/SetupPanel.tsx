import { useEffect, useState } from "react";
import { FolderGit2, Link2, Plus, Sparkles } from "lucide-react";

export interface SetupPanelProps {
  workspacePath: string | null;
  userLogin: string | null;
  isBusy: boolean;
  errorMessage: string | null;
  onInitRepo: () => void;
  onCloneRepo: (url: string, targetPath: string) => void;
}

export function SetupPanel({
  workspacePath,
  userLogin,
  isBusy,
  errorMessage,
  onInitRepo,
  onCloneRepo,
}: SetupPanelProps) {
  const [remoteUrl, setRemoteUrl] = useState("");
  const [clonePath, setClonePath] = useState(workspacePath ?? "");

  useEffect(() => {
    setClonePath(workspacePath ?? "");
  }, [workspacePath]);

  const cloneDisabled =
    isBusy || remoteUrl.trim().length === 0 || clonePath.trim().length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col justify-center p-5">
      <section className="mx-auto w-full max-w-sm text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.6rem] border border-border/60 bg-[rgb(var(--color-bg)/0.82)] shadow-[0_16px_40px_rgba(148,163,184,0.06)]">
          <FolderGit2 className="h-7 w-7 text-accent" />
        </div>

        <div className="mt-6 space-y-2">
          <h3 className="text-[1.05rem] font-semibold tracking-tight text-fg">
            {workspacePath ? "为工作区接入 Git" : "打开工作区后启用 Git"}
          </h3>
          <p className="text-sm leading-6 text-muted">
            {workspacePath
              ? "初始化本地仓库，或粘贴远端地址直接 clone。"
              : "先从左侧打开一个工作区，再查看历史与变更。"}
          </p>
        </div>

        <div className="mt-6 grid gap-3 text-left">
          <button
            type="button"
            className="inline-flex h-11 items-center justify-between rounded-[1.1rem] border border-border/70 bg-[rgb(var(--color-bg)/0.72)] px-4 text-sm font-medium text-fg transition hover:border-accent/35 hover:bg-accent/8 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isBusy || !workspacePath}
            onClick={onInitRepo}
          >
            <span>初始化仓库</span>
            <Plus className="h-4 w-4 text-accent" />
          </button>

          <div className="rounded-[1.4rem] border border-border/60 bg-[rgb(var(--color-bg)/0.72)] p-3">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Remote URL
              <input
                className="mt-2 w-full rounded-[0.95rem] border border-border/70 bg-transparent px-3 py-2 text-sm text-fg outline-none transition focus:border-accent/40"
                value={remoteUrl}
                placeholder="https://github.com/owner/repo.git"
                onChange={(event) => setRemoteUrl(event.target.value)}
              />
            </label>

            <label className="mt-3 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Clone Path
              <input
                className="mt-2 w-full rounded-[0.95rem] border border-border/70 bg-transparent px-3 py-2 text-sm text-fg outline-none transition focus:border-accent/40"
                value={clonePath}
                placeholder="/path/to/clone"
                onChange={(event) => setClonePath(event.target.value)}
              />
            </label>

            <button
              type="button"
              className="mt-3 inline-flex h-10 w-full items-center justify-between rounded-[0.95rem] border border-border/70 bg-white/[0.04] px-3 text-sm font-medium text-fg transition hover:border-accent/35 hover:bg-accent/8 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={cloneDisabled}
              onClick={() => onCloneRepo(remoteUrl.trim(), clonePath.trim())}
            >
              <span>Clone 仓库</span>
              <Link2 className="h-4 w-4 text-accent" />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] text-muted">
            {userLogin ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1.5">
                已连接 GitHub · {userLogin}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              粘贴仓库地址即可开始
            </span>
          </div>

          {errorMessage ? (
            <p className="rounded-[1rem] border border-rose-300/35 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-300/15 dark:bg-rose-400/10 dark:text-rose-100">
              {errorMessage}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
