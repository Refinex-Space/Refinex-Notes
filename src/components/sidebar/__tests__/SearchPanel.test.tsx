import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { mergeSearchResults, highlightTokens, SearchPanel } from "../SearchPanel";

describe("SearchPanel helpers", () => {
  it("merges fulltext and file results by path while keeping higher score", () => {
    const merged = mergeSearchResults(
      [
        {
          path: "Inbox/Quick Note.md",
          title: "Quick Note",
          snippet: "Inbox/Quick Note.md",
          score: 120,
        },
      ],
      [
        {
          path: "Inbox/Quick Note.md",
          title: "Quick Note",
          snippet: "Tantivy indexing makes search fast",
          score: 160,
        },
      ],
    );

    expect(merged).toHaveLength(1);
    expect(merged[0].score).toBe(160);
    expect(merged[0].snippet).toContain("Tantivy");
  });

  it("highlights matched query tokens", () => {
    const segments = highlightTokens("Tantivy makes search fast", "search");
    expect(segments.some((segment) => segment.highlighted && segment.value === "search")).toBe(true);
  });
});

describe("SearchPanel", () => {
  it("renders a custom search trigger when provided", () => {
    const markup = renderToStaticMarkup(
      <SearchPanel
        workspacePath={null}
        onSelectResult={vi.fn()}
        tooltipLabel="搜索项目"
        trigger={
          <button type="button" aria-label="搜索项目">
            trigger
          </button>
        }
      />,
    );

    expect(markup).toContain("aria-label=\"搜索项目\"");
    expect(markup).toContain("trigger");
  });
});
