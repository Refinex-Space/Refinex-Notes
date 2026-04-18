import { X } from "lucide-react";
import { useEffect } from "react";

// ── Diff line types ───────────────────────────────────────────────────────────

interface DiffLine {
  type: "context" | "add" | "remove" | "hunk" | "meta" | "noNewline";
  content: string;
  oldNo: number | null;
  newNo: number | null;
}

// ── Unified diff parser ───────────────────────────────────────────────────────

function parseDiff(patch: string): DiffLine[] {
  if (!patch.trim()) return [];

  const lines = patch.split("\n");
  const result: DiffLine[] = [];
  let oldNo = 0;
  let newNo = 0;

  for (const rawLine of lines) {
    if (rawLine === "") continue;

    if (
      rawLine.startsWith("diff ") ||
      rawLine.startsWith("index ") ||
      rawLine.startsWith("--- ") ||
      rawLine.startsWith("+++ ") ||
      rawLine.startsWith("new file") ||
      rawLine.startsWith("deleted file") ||
      rawLine.startsWith("old mode") ||
      rawLine.startsWith("new mode")
    ) {
      result.push({ type: "meta", content: rawLine, oldNo: null, newNo: null });
      continue;
    }

    if (rawLine.startsWith("@@")) {
      const match = /@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(rawLine);
      if (match) {
        oldNo = Number.parseInt(match[1], 10);
        newNo = Number.parseInt(match[2], 10);
      }
      result.push({ type: "hunk", content: rawLine, oldNo: null, newNo: null });
      continue;
    }

    if (rawLine === String.raw`\ No newline at end of file`) {
      result.push({
        type: "noNewline",
        content: rawLine,
        oldNo: null,
        newNo: null,
      });
      continue;
    }

    if (rawLine.startsWith("+")) {
      result.push({
        type: "add",
        content: rawLine.slice(1),
        oldNo: null,
        newNo: newNo++,
      });
    } else if (rawLine.startsWith("-")) {
      result.push({
        type: "remove",
        content: rawLine.slice(1),
        oldNo: oldNo++,
        newNo: null,
      });
    } else if (rawLine.startsWith(" ")) {
      result.push({
        type: "context",
        content: rawLine.slice(1),
        oldNo: oldNo++,
        newNo: newNo++,
      });
    }
  }

  return result;
}

// ── Single diff line row ──────────────────────────────────────────────────────

const BG: Record<DiffLine["type"], string> = {
  add: "bg-emerald-500/[0.09] hover:bg-emerald-500/[0.13]",
  remove: "bg-rose-500/[0.09] hover:bg-rose-500/[0.13]",
  hunk: "bg-accent/[0.07]",
  context: "hover:bg-fg/[0.025]",
  noNewline: "bg-amber-500/[0.07]",
  meta: "",
};

const TEXT: Record<DiffLine["type"], string> = {
  add: "text-emerald-700 dark:text-emerald-300",
  remove: "text-rose-700 dark:text-rose-300",
  hunk: "text-accent/70 italic text-[11px]",
  context: "text-fg",
  noNewline: "text-amber-600 dark:text-amber-400",
  meta: "text-muted/60",
};

const INDICATOR: Record<DiffLine["type"], string> = {
  add: "+",
  remove: "−",
  context: " ",
  hunk: "",
  noNewline: "↵",
  meta: "",
};

const INDICATOR_COLOR: Record<DiffLine["type"], string> = {
  add: "text-emerald-600 dark:text-emerald-400 font-bold",
  remove: "text-rose-600 dark:text-rose-400 font-bold",
  context: "text-transparent select-none",
  hunk: "",
  noNewline: "text-amber-500",
  meta: "",
};

function DiffLineRow({ line }: { readonly line: DiffLine }) {
  if (line.type === "meta") return null;

  return (
    <tr className={`${BG[line.type]} select-text`}>
      {/* Old line number */}
      <td className="w-10 select-none border-r border-border/20 px-2 text-right font-mono text-[11px] text-muted/40">
        {line.oldNo ?? ""}
      </td>
      {/* New line number */}
      <td className="w-10 select-none border-r border-border/20 px-2 text-right font-mono text-[11px] text-muted/40">
        {line.newNo ?? ""}
      </td>
      {/* +/- indicator */}
      <td
        className={`w-5 select-none px-1 text-center text-[11px] ${INDICATOR_COLOR[line.type]}`}
      >
        {INDICATOR[line.type]}
      </td>
      {/* Code */}
      <td
        className={`whitespace-pre px-3 py-px font-mono text-[12px] leading-[1.65] ${TEXT[line.type]}`}
      >
        {line.content || " "}
      </td>
    </tr>
  );
}

// ── DiffModal ─────────────────────────────────────────────────────────────────

export function DiffModal({
  filePath,
  patch,
  onClose,
}: {
  readonly filePath: string;
  readonly patch: string;
  readonly onClose: () => void;
}) {
  const parsedLines = parseDiff(patch);
  const visibleLines = parsedLines.filter((l) => l.type !== "meta");
  const additions = parsedLines.filter((l) => l.type === "add").length;
  const deletions = parsedLines.filter((l) => l.type === "remove").length;

  // Close on Escape key
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
      <div className="flex h-[80vh] w-[80vw] flex-col overflow-hidden rounded-xl border border-border/30 bg-bg shadow-2xl">
        {/* ── Header ── */}
        <div className="flex shrink-0 items-center gap-3 border-b border-border/60 px-5 py-3">
          <span
            className="flex-1 truncate font-mono text-[13px] font-medium text-fg"
            title={filePath}
          >
            {filePath}
          </span>

          <div className="flex shrink-0 items-center gap-1.5">
            {additions > 0 && (
              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                +{additions}
              </span>
            )}
            {deletions > 0 && (
              <span className="rounded bg-rose-500/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                −{deletions}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="关闭差异查看器"
            className="ml-1 rounded-md p-1 text-muted transition hover:bg-fg/[0.06] hover:text-fg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Diff content ── */}
        <div className="min-h-0 flex-1 overflow-auto">
          {visibleLines.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-[13px] text-muted">
                {patch.trim()
                  ? "差异内容仅包含文件元数据，无代码行变更。"
                  : "此文件暂无可显示的差异。"}
              </p>
            </div>
          ) : (
            <table
              className="min-w-full border-collapse"
              style={{
                fontFamily:
                  "ui-monospace, SFMono-Regular, 'Fira Code', Menlo, Monaco, monospace",
              }}
            >
              <tbody>
                {parsedLines.map((line, i) => (
                  // Key by index: diff lines have no stable identity
                  // eslint-disable-next-line react/no-array-index-key
                  <DiffLineRow key={i} line={line} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ── DiffPane (embeddable diff viewer without overlay) ─────────────────────────

export function DiffPane({
  patch,
  filePath,
}: {
  readonly patch: string;
  readonly filePath: string;
}) {
  const parsedLines = parseDiff(patch);
  const visibleLines = parsedLines.filter((l) => l.type !== "meta");
  const additions = parsedLines.filter((l) => l.type === "add").length;
  const deletions = parsedLines.filter((l) => l.type === "remove").length;

  return (
    <div className="flex h-full flex-col">
      {/* Thin stats bar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border/40 px-4 py-1.5">
        <span
          className="flex-1 truncate font-mono text-[11.5px] text-muted/70"
          title={filePath}
        >
          {filePath}
        </span>
        {additions > 0 && (
          <span className="font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            +{additions}
          </span>
        )}
        {deletions > 0 && (
          <span className="font-mono text-[11px] font-semibold text-rose-600 dark:text-rose-400">
            −{deletions}
          </span>
        )}
      </div>
      {/* Diff table */}
      <div className="min-h-0 flex-1 overflow-auto">
        {visibleLines.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-[13px] text-muted">
              {patch.trim()
                ? "差异内容仅包含文件元数据，无代码行变更。"
                : "此文件暂无可显示的差异。"}
            </p>
          </div>
        ) : (
          <table
            className="min-w-full border-collapse"
            style={{
              fontFamily:
                "ui-monospace, SFMono-Regular, 'Fira Code', Menlo, Monaco, monospace",
            }}
          >
            <tbody>
              {parsedLines.map((line, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <DiffLineRow key={i} line={line} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default DiffModal;
