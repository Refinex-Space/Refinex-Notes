import { useEffect, useState } from "react";
import { FolderGit2, GitBranch, Link2, Sparkles } from "lucide-react";

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
    <div className="flex h-full min-h-0 flex-col gap-4 p-4">
      <section className="rounded-[1.75rem] border border-border/70 bg-[linear-gradient(180deg,rgba(20,34,59,0.88),rgba(9,16,30,0.92))] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/80">
              Git Setup
            </p>
            <h3 className="mt-2 text-lg font-semibold text-fg">为当前工作区接入版本同步</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              当前工作区尚未初始化 Git 仓库。可以直接初始化本地仓库，或粘贴 GitHub remote URL 进行 clone。
            </p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.05] p-2 text-cyan-100">
            <FolderGit2 className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-fg/90">
            <GitBranch className="h-3.5 w-3.5 text-fg/75" />
            <span>{userLogin ? `GitHub 已连接：${userLogin}` : "GitHub 已登录，可直接使用 remote URL"}</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/16 bg-cyan-400/10 px-3 py-1.5 text-[11px] text-cyan-50">
            <Sparkles className="h-3.5 w-3.5" />
            <span>当前未暴露仓库列表接口，请直接粘贴仓库地址</span>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border/70 bg-bg/70 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-fg">方案 A · 初始化新仓库</p>
            <p className="mt-1 text-sm leading-6 text-muted">
              在当前工作区创建新的 Git 仓库，后续可再关联 remote origin。
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/12 px-4 py-2 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-400/18 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isBusy || !workspacePath}
            onClick={onInitRepo}
          >
            <FolderGit2 className="h-4 w-4" />
            初始化
          </button>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted">
          当前目录：{workspacePath ?? "请先从左侧打开一个本地工作区"}
        </p>
      </section>

      <section className="rounded-3xl border border-border/70 bg-bg/70 p-4">
        <div>
          <p className="text-sm font-semibold text-fg">方案 B · Clone 已有仓库</p>
          <p className="mt-1 text-sm leading-6 text-muted">
            将 GitHub 仓库 clone 到目标目录，然后切换工作区继续编辑。
          </p>
        </div>

        <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.2em] text-muted">
          Remote URL
          <input
            className="mt-2 w-full rounded-2xl border border-border/70 bg-white/[0.03] px-3 py-2 text-sm text-fg outline-none transition focus:border-accent/40"
            value={remoteUrl}
            placeholder="https://github.com/owner/repo.git"
            onChange={(event) => setRemoteUrl(event.target.value)}
          />
        </label>

        <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.2em] text-muted">
          Clone Path
          <input
            className="mt-2 w-full rounded-2xl border border-border/70 bg-white/[0.03] px-3 py-2 text-sm text-fg outline-none transition focus:border-accent/40"
            value={clonePath}
            placeholder="/path/to/clone"
            onChange={(event) => setClonePath(event.target.value)}
          />
        </label>

        <button
          type="button"
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border/70 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-fg transition hover:border-accent/35 hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={cloneDisabled}
          onClick={() => onCloneRepo(remoteUrl.trim(), clonePath.trim())}
        >
          <Link2 className="h-4 w-4" />
          Clone 仓库
        </button>

        {errorMessage ? (
          <p className="mt-3 rounded-2xl border border-rose-300/15 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
            {errorMessage}
          </p>
        ) : null}
      </section>
    </div>
  );
}
