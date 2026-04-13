import { Activity, FileText, GitBranch, Languages } from "lucide-react";

export interface StatusBarProps {
  syncLabel: string;
  syncTone?: "synced" | "pending" | "offline";
  cursor: { line: number; col: number };
  wordCount: number;
  language: string;
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
}: StatusBarProps) {
  return (
    <footer className="grid h-10 grid-cols-[1fr_auto_1fr] items-center gap-4 border-t border-border/70 bg-bg/90 px-4 text-xs text-muted backdrop-blur">
      <div className="flex min-w-0 items-center gap-2">
        <GitBranch className={["h-3.5 w-3.5", syncToneClasses(syncTone)].join(" ")} />
        <span className="truncate">{syncLabel}</span>
      </div>

      <div className="flex items-center gap-2 rounded-full border border-border/70 px-3 py-1 text-fg">
        <Activity className="h-3.5 w-3.5 text-accent" />
        <span>
          {cursor.line}:{cursor.col}
        </span>
      </div>

      <div className="flex min-w-0 items-center justify-end gap-4">
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5" />
          <span>{wordCount} words</span>
        </div>
        <div className="flex items-center gap-2">
          <Languages className="h-3.5 w-3.5" />
          <span>{language}</span>
        </div>
      </div>
    </footer>
  );
}

export default StatusBar;
