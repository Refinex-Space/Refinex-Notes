import { GitBranch } from "lucide-react";
import type { ReactNode } from "react";

export interface StatusBarProps {
  syncLabel: string;
  syncTone?: "synced" | "pending" | "offline";
  cursor: { line: number; col: number };
  wordCount: number;
  language: string;
  encoding?: string;
  gitStatusSlot?: ReactNode;
}

function syncToneClasses(syncTone: NonNullable<StatusBarProps["syncTone"]>) {
  switch (syncTone) {
    case "pending":
      return "text-amber-400";
    case "offline":
      return "text-slate-400";
    default:
      return "text-emerald-400";
  }
}

export function StatusBar({
  syncLabel,
  syncTone = "synced",
  cursor,
  wordCount,
  language,
  encoding = "UTF-8",
  gitStatusSlot,
}: StatusBarProps) {
  return (
    <footer className="flex h-7 items-center justify-between border-t border-border/70 bg-bg/90 px-3 text-[11px] text-muted backdrop-blur">
      {/* Left: GitHub account + sync status */}
      <div className="flex min-w-0 items-center gap-2">
        {gitStatusSlot ?? (
          <>
            <GitBranch
              className={["h-3 w-3 shrink-0", syncToneClasses(syncTone)].join(
                " ",
              )}
            />
            <span className="truncate">{syncLabel}</span>
          </>
        )}
      </div>

      {/* Right: language | encoding | word count | cursor */}
      <div className="flex items-center gap-3 text-muted/80">
        <span>{language}</span>
        <span className="opacity-40">|</span>
        <span>{encoding}</span>
        <span className="opacity-40">|</span>
        <span>{wordCount.toLocaleString()} 字</span>
        <span className="opacity-40">|</span>
        <span>
          行 {cursor.line}, 列 {cursor.col}
        </span>
      </div>
    </footer>
  );
}

export default StatusBar;
