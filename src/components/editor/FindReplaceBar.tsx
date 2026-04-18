import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Replace,
  Search,
  X,
} from "lucide-react";
import {
  type KeyboardEvent,
  type MutableRefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import { type EditorView } from "prosemirror-view";

import {
  findReplaceKey,
  dispatchFindQuery,
  dispatchFindNext,
  dispatchFindPrev,
  dispatchReplaceAll,
  dispatchReplaceOne,
} from "../../editor/plugins/find-replace";

export interface FindReplaceBarProps {
  editorViewRef: MutableRefObject<EditorView | null>;
  onClose: () => void;
}

// Small "Aa" case-sensitivity icon (text-based, no external dep)
function CaseSensitiveIcon({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={[
        "select-none font-mono text-[10px] font-bold leading-none tracking-tight",
        active ? "text-accent" : "text-muted/70",
      ].join(" ")}
    >
      Aa
    </span>
  );
}

export function FindReplaceBar({
  editorViewRef,
  onClose,
}: FindReplaceBarProps) {
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [replaceExpanded, setReplaceExpanded] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);

  const findInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus find input on mount
  useEffect(() => {
    findInputRef.current?.focus();
  }, []);

  // Clean up highlights when bar unmounts
  useEffect(() => {
    return () => {
      const view = editorViewRef.current;
      if (view && !view.isDestroyed) {
        dispatchFindQuery(view, "", false);
      }
    };
  }, [editorViewRef]);

  /**
   * Safety net: after every render triggered by a query/caseSensitive change,
   * re-read the plugin state directly from view.state. This ensures matchCount
   * is always in sync even if syncMatchState ran before view.state was updated
   * (e.g. React 18 batching of setOverlayVersion inside dispatchTransaction).
   */
  useEffect(() => {
    if (!query) {
      setMatchCount(0);
      setCurrentMatch(0);
      return;
    }
    const view = editorViewRef.current;
    if (!view || view.isDestroyed) return;
    const ps = findReplaceKey.getState(view.state);
    if (ps && ps.query === query && ps.caseSensitive === caseSensitive) {
      setMatchCount(ps.matches.length);
      setCurrentMatch(ps.current);
    }
  }, [query, caseSensitive, editorViewRef]);

  /** Read plugin state from the view and sync into React state. */
  function syncMatchState(view: EditorView) {
    const pluginState = findReplaceKey.getState(view.state);
    setMatchCount(pluginState?.matches.length ?? 0);
    setCurrentMatch(pluginState?.current ?? 0);
  }

  /** Dispatch a new query and sync state. */
  function applyQuery(newQuery: string, newCaseSensitive = caseSensitive) {
    const view = editorViewRef.current;
    if (!view || view.isDestroyed) return;
    dispatchFindQuery(view, newQuery, newCaseSensitive);
    syncMatchState(view);
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    applyQuery(value, caseSensitive);
  }

  function handleCaseSensitiveToggle() {
    const next = !caseSensitive;
    setCaseSensitive(next);
    applyQuery(query, next);
  }

  function handleNext() {
    const view = editorViewRef.current;
    if (!view || view.isDestroyed) return;
    dispatchFindNext(view);
    syncMatchState(view);
  }

  function handlePrev() {
    const view = editorViewRef.current;
    if (!view || view.isDestroyed) return;
    dispatchFindPrev(view);
    syncMatchState(view);
  }

  function handleReplace() {
    const view = editorViewRef.current;
    if (!view || view.isDestroyed) return;
    dispatchReplaceOne(view, replacement);
    syncMatchState(view);
  }

  function handleReplaceAll() {
    const view = editorViewRef.current;
    if (!view || view.isDestroyed) return;
    dispatchReplaceAll(view, replacement);
    syncMatchState(view);
  }

  function handleClose() {
    const view = editorViewRef.current;
    if (view && !view.isDestroyed) {
      dispatchFindQuery(view, "", false);
    }
    onClose();
  }

  function handleFindKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrev();
      } else {
        handleNext();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleClose();
    }
  }

  function handleReplaceKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleReplace();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleClose();
    }
  }

  const hasMatches = matchCount > 0;
  const hasQuery = query.length > 0;

  const btnBase =
    "inline-flex h-[22px] shrink-0 cursor-pointer items-center justify-center rounded border-none bg-transparent transition-colors duration-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40";

  const iconBtnClass = `${btnBase} w-[22px] text-muted/70 hover:bg-fg/[0.06] hover:text-muted`;

  const textBtnClass = `${btnBase} px-1.5 text-[11px] font-medium text-muted/80 hover:bg-fg/[0.06] hover:text-muted`;

  return (
    <div className="flex flex-col border-t border-border/70 bg-bg/90 backdrop-blur-sm">
      {/* Find row */}
      <div className="flex h-9 items-center gap-1.5 px-3">
        {/* Expand/collapse replace */}
        <button
          type="button"
          title={replaceExpanded ? "折叠替换" : "展开替换"}
          aria-label={replaceExpanded ? "折叠替换" : "展开替换"}
          className={iconBtnClass}
          onClick={() => setReplaceExpanded((v) => !v)}
        >
          <ChevronsUpDown className="h-3 w-3" />
        </button>

        <Search className="h-3 w-3 shrink-0 text-muted/50" />

        <input
          ref={findInputRef}
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={handleFindKeyDown}
          placeholder="搜索文档..."
          spellCheck={false}
          className="min-w-0 flex-1 border-none bg-transparent text-[12.5px] text-fg outline-none placeholder:text-muted/40"
        />

        {/* Case sensitive toggle */}
        <button
          type="button"
          title="区分大小写"
          aria-label="区分大小写"
          className={`${iconBtnClass} ${caseSensitive ? "bg-accent/10 text-accent hover:bg-accent/15" : ""}`}
          onClick={handleCaseSensitiveToggle}
        >
          <CaseSensitiveIcon active={caseSensitive} />
        </button>

        {/* Match count */}
        <span
          className={[
            "shrink-0 text-[11px] tabular-nums",
            hasQuery && !hasMatches ? "text-red-500/80" : "text-muted/50",
          ].join(" ")}
        >
          {!hasQuery
            ? ""
            : !hasMatches
              ? "无结果"
              : `${currentMatch + 1} / ${matchCount}`}
        </span>

        {/* Prev / Next */}
        <button
          type="button"
          title="上一个 (Shift+Enter)"
          aria-label="上一个"
          disabled={!hasMatches}
          className={`${iconBtnClass} disabled:cursor-not-allowed disabled:opacity-40`}
          onClick={handlePrev}
        >
          <ChevronUp className="h-3 w-3" />
        </button>
        <button
          type="button"
          title="下一个 (Enter)"
          aria-label="下一个"
          disabled={!hasMatches}
          className={`${iconBtnClass} disabled:cursor-not-allowed disabled:opacity-40`}
          onClick={handleNext}
        >
          <ChevronDown className="h-3 w-3" />
        </button>

        {/* Close */}
        <button
          type="button"
          title="关闭搜索 (Esc)"
          aria-label="关闭搜索"
          className={iconBtnClass}
          onClick={handleClose}
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Replace row — only rendered when expanded */}
      {replaceExpanded ? (
        <div className="flex h-9 items-center gap-1.5 border-t border-border/40 px-3">
          {/* spacer matching the expand button */}
          <span className="w-[22px] shrink-0" />

          <Replace className="h-3 w-3 shrink-0 text-muted/50" />

          <input
            type="text"
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            onKeyDown={handleReplaceKeyDown}
            placeholder="替换为..."
            spellCheck={false}
            className="min-w-0 flex-1 border-none bg-transparent text-[12.5px] text-fg outline-none placeholder:text-muted/40"
          />

          <button
            type="button"
            disabled={!hasMatches}
            className={`${textBtnClass} disabled:cursor-not-allowed disabled:opacity-40`}
            onClick={handleReplace}
          >
            替换
          </button>
          <button
            type="button"
            disabled={!hasMatches}
            className={`${textBtnClass} disabled:cursor-not-allowed disabled:opacity-40`}
            onClick={handleReplaceAll}
          >
            全部替换
          </button>
        </div>
      ) : null}
    </div>
  );
}
