import { Check, ChevronDown, FolderOpen, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";

import type { RecentWorkspace } from "../../types/notes";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

function getWorkspaceName(path: string) {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path;
}

function getWorkspaceMeta(path: string) {
  const segments = path.split(/[\\/]/).filter(Boolean);
  if (segments.length <= 1) {
    return path;
  }

  return segments.slice(0, -1).join("/");
}

export interface WorkspaceSwitcherProps {
  workspacePath: string | null;
  recentWorkspaces: RecentWorkspace[];
  onOpenWorkspace: () => void;
  onSelectWorkspace: (path: string) => void;
  onRemoveWorkspace: (path: string) => void;
}

export function WorkspaceSwitcher({
  workspacePath,
  recentWorkspaces,
  onOpenWorkspace,
  onSelectWorkspace,
  onRemoveWorkspace,
}: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false);

  const orderedRecentWorkspaces = useMemo(() => {
    if (!workspacePath) {
      return recentWorkspaces;
    }

    const current = recentWorkspaces.find(
      (entry) => entry.path === workspacePath,
    );
    const others = recentWorkspaces.filter(
      (entry) => entry.path !== workspacePath,
    );

    return current ? [current, ...others] : others;
  }, [recentWorkspaces, workspacePath]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={[
            "group flex h-10 min-w-0 flex-1 items-center justify-between gap-2 rounded-[0.95rem] border border-border/70 bg-white/[0.04] pl-2.5 pr-2 text-left transition",
            "hover:border-accent/35 hover:bg-accent/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
          ].join(" ")}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[0.8rem] bg-white/[0.05] text-fg/75">
              <FolderOpen className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold text-fg">
                {workspacePath
                  ? getWorkspaceName(workspacePath)
                  : "Open Workspace"}
              </span>
            </span>
          </span>

          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted transition group-hover:text-fg" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[19rem] space-y-2.5 rounded-[1.5rem] p-2.5"
      >
        <button
          type="button"
          className="inline-flex h-10 w-full items-center justify-between rounded-[1rem] border border-border/70 bg-white/[0.03] px-3 text-sm font-medium text-fg transition hover:border-accent/35 hover:bg-accent/10"
          onClick={() => {
            setOpen(false);
            onOpenWorkspace();
          }}
        >
          <span>打开工作区…</span>
          <Plus className="h-4 w-4 text-accent" />
        </button>

        <div className="space-y-1">
          {orderedRecentWorkspaces.length === 0 ? (
            <div className="rounded-[1rem] border border-dashed border-border/70 px-3 py-3 text-center text-xs text-muted">
              暂无最近工作区
            </div>
          ) : (
            orderedRecentWorkspaces.map((workspace) => {
              const isCurrent = workspace.path === workspacePath;
              return (
                <div
                  key={workspace.path}
                  className={[
                    "flex items-center gap-2 rounded-[1rem] px-1.5 py-1 transition",
                    isCurrent ? "bg-accent/8" : "hover:bg-white/[0.04]",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                    onClick={() => {
                      setOpen(false);
                      onSelectWorkspace(workspace.path);
                    }}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[0.8rem] border border-border/70 bg-white/[0.04] text-fg/70">
                      {isCurrent ? (
                        <Check className="h-3.5 w-3.5 text-accent" />
                      ) : (
                        <FolderOpen className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-fg">
                        {getWorkspaceName(workspace.path)}
                      </span>
                      <span className="block truncate text-[11px] text-muted">
                        {getWorkspaceMeta(workspace.path)}
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    aria-label={`移除 ${getWorkspaceName(workspace.path)}`}
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-transparent text-rose-500 transition hover:bg-rose-500/18 hover:text-rose-700 hover:ring-1 hover:ring-rose-300/45 dark:text-rose-300 dark:hover:bg-rose-400/18 dark:hover:text-rose-100 dark:hover:ring-rose-300/30"
                    onClick={() => {
                      onRemoveWorkspace(workspace.path);
                    }}
                  >
                    <X className="h-3.5 w-3.5 stroke-[2.2]" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default WorkspaceSwitcher;
