import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  FileSearch,
  Search as SearchIcon,
  Sparkles,
} from "lucide-react";

import { searchService } from "../../services/searchService";
import type { SearchResult } from "../../types/search";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";

const SEARCH_DEBOUNCE_MS = 120;

export interface SearchPanelProps {
  workspacePath: string | null;
  onSelectResult: (result: SearchResult, query: string) => void;
}

export function mergeSearchResults(
  fileResults: SearchResult[],
  fulltextResults: SearchResult[],
) {
  const merged = new Map<string, SearchResult>();

  for (const result of [...fulltextResults, ...fileResults]) {
    const existing = merged.get(result.path);
    if (!existing || result.score > existing.score) {
      merged.set(result.path, result);
      continue;
    }

    if (!existing.snippet && result.snippet) {
      merged.set(result.path, result);
    }
  }

  return Array.from(merged.values()).sort((left, right) => {
    return right.score - left.score || left.path.localeCompare(right.path, "en");
  });
}

export function highlightTokens(text: string, query: string) {
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 0);

  if (tokens.length === 0) {
    return [{ value: text, highlighted: false }];
  }

  const segments: Array<{ value: string; highlighted: boolean }> = [];
  let cursor = 0;
  const lowerText = text.toLowerCase();

  while (cursor < text.length) {
    const nextMatch = tokens
      .map((token) => ({ token, index: lowerText.indexOf(token, cursor) }))
      .filter((entry) => entry.index >= 0)
      .sort((left, right) => left.index - right.index)[0];

    if (!nextMatch) {
      segments.push({ value: text.slice(cursor), highlighted: false });
      break;
    }

    if (nextMatch.index > cursor) {
      segments.push({
        value: text.slice(cursor, nextMatch.index),
        highlighted: false,
      });
    }

    segments.push({
      value: text.slice(nextMatch.index, nextMatch.index + nextMatch.token.length),
      highlighted: true,
    });
    cursor = nextMatch.index + nextMatch.token.length;
  }

  return segments.filter((segment) => segment.value.length > 0);
}

export function SearchPanel({ workspacePath, onSelectResult }: SearchPanelProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (
      !open ||
      !workspacePath ||
      query.trim().length === 0 ||
      !searchService.isNativeAvailable()
    ) {
      setResults([]);
      setIsLoading(false);
      setErrorMessage(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        setIsLoading(true);
        setErrorMessage(null);

        try {
          const trimmed = query.trim();
          const fileResults = await searchService.searchFiles(trimmed);
          const nextResults =
            trimmed.length < 3
              ? fileResults
              : mergeSearchResults(
                  fileResults,
                  await searchService.searchFulltext(trimmed),
                );

          if (!cancelled) {
            setResults(nextResults);
          }
        } catch (error) {
          if (!cancelled) {
            setErrorMessage(error instanceof Error ? error.message : "搜索失败");
            setResults([]);
          }
        } finally {
          if (!cancelled) {
            setIsLoading(false);
          }
        }
      })();
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, workspacePath]);

  const emptyLabel = useMemo(() => {
    if (!workspacePath) {
      return "打开项目后即可开始搜索。";
    }
    if (query.trim().length === 0) {
      return "输入文件名、标题或正文关键词开始检索。";
    }
    if (isLoading) {
      return "正在搜索…";
    }
    if (errorMessage) {
      return errorMessage;
    }
    return "没有匹配结果。";
  }, [errorMessage, isLoading, query, workspacePath]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setQuery("");
          setResults([]);
          setIsLoading(false);
          setErrorMessage(null);
        }
      }}
    >
      <div className="px-4 py-4">
        <DialogTrigger asChild>
          <button
            type="button"
            className="group flex w-full items-center justify-between rounded-[1.4rem] border border-border/70 bg-white/75 px-3 py-3 text-left shadow-[0_10px_30px_rgba(148,163,184,0.14)] transition hover:border-accent/35 hover:bg-white dark:bg-white/[0.04] dark:shadow-none"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="rounded-full border border-border/70 bg-bg/80 p-2 text-accent">
                <SearchIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-fg">搜索项目</p>
                <p className="truncate text-xs text-muted">
                  文件名模糊检索与全文搜索
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted transition group-hover:text-accent">
              <span>打开</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </button>
        </DialogTrigger>
      </div>

      <DialogContent className="max-w-3xl overflow-hidden p-0">
        <div className="bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(241,245,249,0.98))] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))]">
          <DialogHeader className="border-b border-border/70 px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="rounded-full border border-cyan-300/30 bg-cyan-50 p-2 text-cyan-600 dark:border-cyan-300/20 dark:bg-cyan-400/10 dark:text-cyan-100">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle>项目搜索</DialogTitle>
                <DialogDescription>
                  统一检索文件名、标题与正文内容。短查询优先模糊匹配，长查询会合并全文结果。
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="border-b border-border/70 px-6 py-4">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                autoFocus
                value={query}
                placeholder="搜索文件名、标题或正文内容…"
                className="w-full rounded-[1.6rem] border border-border/70 bg-white/80 py-3 pl-11 pr-4 text-sm text-fg outline-none transition placeholder:text-muted focus:border-accent/40 focus:bg-white dark:bg-white/[0.04] dark:focus:bg-white/[0.06]"
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>

          <div className="max-h-[60vh] overflow-auto px-4 py-4">
            {results.length === 0 ? (
              <div className="flex min-h-[240px] items-center justify-center px-6 py-10 text-center">
                <p className="max-w-md text-sm leading-7 text-muted">{emptyLabel}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((result) => (
                  <button
                    key={`${result.path}:${result.title}`}
                    type="button"
                    className="w-full rounded-[1.6rem] border border-border/70 bg-white/80 px-4 py-4 text-left shadow-[0_12px_30px_rgba(148,163,184,0.08)] transition hover:border-accent/35 hover:bg-white dark:bg-white/[0.03] dark:shadow-none dark:hover:bg-white/[0.05]"
                    onClick={() => {
                      onSelectResult(result, query);
                      setOpen(false);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-full border border-border/70 bg-bg/80 p-2 text-fg/75">
                        <FileSearch className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-semibold text-fg">{result.title}</p>
                          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
                            score {Math.round(result.score)}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs text-muted">{result.path}</p>
                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">
                          {highlightTokens(result.snippet || result.path, query).map((segment, index) =>
                            segment.highlighted ? (
                              <mark
                                key={`${result.path}:${index}`}
                                className="rounded bg-accent/20 px-0.5 text-accent"
                              >
                                {segment.value}
                              </mark>
                            ) : (
                              <span key={`${result.path}:${index}`}>{segment.value}</span>
                            ),
                          )}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
