import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  CloudOff,
  History,
  RefreshCcw,
  Settings2,
} from "lucide-react";

import { useGitStore } from "../../stores/gitStore";
import type { GitSyncPhase } from "../../types/git";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

export interface SyncStatusProps {
  onOpenHistory?: () => void;
  onOpenSettings?: () => void;
}

export function syncIndicatorMeta(phase: GitSyncPhase) {
  switch (phase) {
    case "synced":
      return {
        label: "已同步",
        icon: CheckCircle2,
        tone: "text-emerald-300",
        chip: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
      };
    case "conflicted":
      return {
        label: "存在冲突",
        icon: AlertTriangle,
        tone: "text-amber-300",
        chip: "border-amber-300/20 bg-amber-400/10 text-amber-100",
      };
    case "offline":
      return {
        label: "离线",
        icon: CloudOff,
        tone: "text-slate-300",
        chip: "border-slate-200/15 bg-slate-200/5 text-slate-100",
      };
    case "not-initialized":
      return {
        label: "未初始化",
        icon: CircleDashed,
        tone: "text-cyan-200",
        chip: "border-cyan-300/20 bg-cyan-400/10 text-cyan-50",
      };
    default:
      return {
        label: "同步中",
        icon: RefreshCcw,
        tone: "text-sky-200",
        chip: "border-sky-300/20 bg-sky-400/10 text-sky-50",
      };
  }
}

export function formatLastSyncTime(lastSyncTime: number | null) {
  if (!lastSyncTime) {
    return "尚无同步记录";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(lastSyncTime * 1000));
}

function changeSummary(count: number) {
  if (count === 0) {
    return "0 个文件待处理";
  }
  return `${count} 个文件待处理`;
}

export function SyncStatus({
  onOpenHistory,
  onOpenSettings,
}: SyncStatusProps) {
  const syncStatus = useGitStore((state) => state.syncStatus);
  const syncDetail = useGitStore((state) => state.syncDetail);
  const lastSyncTime = useGitStore((state) => state.lastSyncTime);
  const changedFiles = useGitStore((state) => state.changedFiles);
  const isRunningAction = useGitStore((state) => state.isRunningAction);
  const forceSync = useGitStore((state) => state.forceSync);

  const meta = syncIndicatorMeta(syncStatus);
  const Icon = meta.icon;

  return (
    <TooltipProvider>
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={[
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-left text-[11px] font-semibold transition",
                  meta.chip,
                ].join(" ")}
              >
                <Icon
                  className={[
                    "h-3.5 w-3.5 shrink-0",
                    meta.tone,
                    syncStatus !== "synced" && syncStatus !== "not-initialized"
                      ? "animate-spin"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                />
                <span className="truncate">{meta.label}</span>
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-1.5">
              <p className="font-semibold">{meta.label}</p>
              <p className="text-slate-300">{syncDetail ?? "等待下一次同步事件"}</p>
              <p className="text-slate-400">最后同步：{formatLastSyncTime(lastSyncTime)}</p>
              <p className="text-slate-400">{changeSummary(changedFiles.length)}</p>
            </div>
          </TooltipContent>
        </Tooltip>

        <PopoverContent align="start" className="w-72 space-y-3">
          <div>
            <p className="text-sm font-semibold text-fg">Git 同步</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              {syncDetail ?? "通过立即同步或查看历史来检查当前工作区的版本状态。"}
            </p>
          </div>

          <div className="grid gap-2">
            <button
              type="button"
              className="inline-flex items-center justify-between rounded-2xl border border-border/70 bg-white/[0.03] px-3 py-2 text-sm text-fg transition hover:border-accent/35 hover:bg-accent/10"
              disabled={isRunningAction}
              onClick={() => {
                void forceSync();
              }}
            >
              <span>立即同步</span>
              <RefreshCcw className="h-4 w-4 text-accent" />
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-between rounded-2xl border border-border/70 bg-white/[0.03] px-3 py-2 text-sm text-fg transition hover:border-accent/35 hover:bg-accent/10"
              onClick={onOpenHistory}
            >
              <span>查看历史</span>
              <History className="h-4 w-4 text-fg/70" />
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-between rounded-2xl border border-border/70 bg-white/[0.03] px-3 py-2 text-sm text-fg transition hover:border-accent/35 hover:bg-accent/10"
              onClick={onOpenSettings}
            >
              <span>设置</span>
              <Settings2 className="h-4 w-4 text-fg/70" />
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}
