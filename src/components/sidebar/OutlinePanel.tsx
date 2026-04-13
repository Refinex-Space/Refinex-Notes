import { Hash } from "lucide-react";
import { useMemo } from "react";

import { useNoteStore } from "../../stores/noteStore";
import type { OutlineHeading } from "../../types";
import { extractOutlineHeadings } from "./sidebar-utils";

export interface OutlinePanelProps {
  markdown?: string;
  onSelectHeading?: (heading: OutlineHeading) => void;
}

export function OutlinePanel({
  markdown,
  onSelectHeading,
}: OutlinePanelProps) {
  const currentFile = useNoteStore((state) => state.currentFile);
  const currentDocument = useNoteStore((state) =>
    currentFile ? state.documents[currentFile] ?? null : null,
  );

  const headings = useMemo(
    () => extractOutlineHeadings(markdown ?? currentDocument?.content ?? ""),
    [currentDocument?.content, markdown],
  );

  if (headings.length === 0) {
    return (
      <div className="p-4 text-sm text-muted">
        当前文档还没有标题结构，输入 <code>#</code> / <code>##</code> /
        <code>###</code> 后会在这里出现目录。
      </div>
    );
  }

  return (
    <div className="space-y-1 p-3">
      {headings.map((heading) => (
        <button
          key={heading.id}
          type="button"
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-muted transition hover:bg-accent/8 hover:text-fg"
          style={{ paddingLeft: `${0.75 + (heading.level - 1) * 1}rem` }}
          onClick={() => onSelectHeading?.(heading)}
        >
          <Hash className="h-3.5 w-3.5 shrink-0 text-accent" />
          <span className="truncate">{heading.text}</span>
        </button>
      ))}
    </div>
  );
}

export default OutlinePanel;
