import { useEffect, useMemo, useState } from "react";
import { FileSearch, Search as SearchIcon } from "lucide-react";

import { searchService } from "../../services/searchService";
import type { SearchResult } from "../../types/search";

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
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!workspacePath || query.trim().length === 0 || !searchService.isNativeAvailable()) {
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
      return "打开工作区后即可构建搜索索引。";
    }
    if (query.trim().length === 0) {
      return "输入关键词开始搜索；短查询走文件名模糊匹配，长查询会叠加全文搜索。";
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
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border/70 px-4 py-2.5">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            placeholder="搜索文件名或全文…"
            className="w-full rounded-2xl border border-border/70 bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-fg outline-none transition placeholder:text-muted focus:border-accent/40"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-2 py-2">
        {results.length === 0 ? (
          <div className="p-3 text-sm leading-6 text-muted">{emptyLabel}</div>
        ) : (
          <div className="space-y-2">
            {results.map((result) => (
              <button
                key={`${result.path}:${result.title}`}
                type="button"
                className="w-full rounded-2xl border border-border/70 bg-white/[0.03] px-3 py-3 text-left transition hover:border-accent/35 hover:bg-white/[0.05]"
                onClick={() => onSelectResult(result, query)}
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-full border border-white/10 bg-white/[0.04] p-1.5 text-fg/70">
                    <FileSearch className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-fg">{result.title}</p>
                    <p className="truncate text-xs text-muted">{result.path}</p>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">
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
  );
}
