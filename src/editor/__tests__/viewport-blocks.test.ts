import { Decoration } from "prosemirror-view";
import { describe, expect, it, vi } from "vitest";

import { parseMarkdown } from "../parser";
import {
  createViewportMeasurementCacheKey,
  estimateViewportShellMetrics,
  isViewportBlockVisible,
  isViewportRectWithinMargin,
  isViewportSkeletonNode,
  readViewportMeasuredHeightPx,
  rememberViewportMeasuredHeightPx,
  resolveViewportMeasureMarginPx,
  resolveViewportShellMinHeightPx,
  scheduleViewportScrollSettle,
  summarizeViewportText,
  VIEWPORT_SCROLL_SETTLE_DELAY_MS,
} from "../plugins/viewport-blocks";
import { describeViewportTextBlockShell } from "../node-views/ViewportTextBlockView";

describe("viewport blocks helpers", () => {
  it("recognizes supported blocks as viewport skeleton nodes", () => {
    const doc = parseMarkdown(
      "# Title\n\nParagraph\n\n> Quote\n\n- Item\n- [x] Task\n\n| A | B |\n| --- | --- |\n| 1 | 2 |",
    );
    const heading = doc.firstChild;
    const paragraph = doc.child(1);
    const blockquote = doc.child(2);
    const bulletList = doc.child(3);
    const listItem = bulletList.firstChild;
    const taskItem = bulletList.lastChild;
    const table = doc.child(4);
    const tableRow = table.firstChild;
    const codeDoc = parseMarkdown("```ts\nconst value = 1;\n```");
    const codeBlock = codeDoc.firstChild;

    expect(heading && isViewportSkeletonNode(heading)).toBe(true);
    expect(paragraph && isViewportSkeletonNode(paragraph)).toBe(true);
    expect(blockquote && isViewportSkeletonNode(blockquote)).toBe(true);
    expect(listItem && isViewportSkeletonNode(listItem)).toBe(true);
    expect(taskItem && isViewportSkeletonNode(taskItem)).toBe(true);
    expect(table && isViewportSkeletonNode(table)).toBe(true);
    expect(tableRow && isViewportSkeletonNode(tableRow)).toBe(true);
    expect(codeBlock && isViewportSkeletonNode(codeBlock)).toBe(false);
  });

  it("summarizes long text and detects viewport decorations", () => {
    expect(
      summarizeViewportText(
        "This is a very long paragraph that should be truncated once it exceeds the configured summary budget for block shells.",
        32,
      ),
    ).toContain("...");

    const decorations = [
      Decoration.node(0, 2, {}, { viewportBlock: true }),
    ];
    expect(isViewportBlockVisible(decorations)).toBe(true);
    expect(isViewportBlockVisible([])).toBe(false);
  });

  it("estimates stable shell heights for different block kinds", () => {
    const doc = parseMarkdown(
      "# Heading\n\nParagraph with enough content to wrap across more than one visual line in a shell.\n\n| A | B |\n| --- | --- |\n| long cell content | value |",
    );
    const heading = doc.firstChild;
    const paragraph = doc.child(1);
    const table = doc.child(2);
    const row = table.firstChild;
    const cell = row?.firstChild;

    if (!heading || !paragraph || !table || !row || !cell) {
      throw new Error("expected heading, paragraph, table, row, cell");
    }

    expect(estimateViewportShellMetrics(heading).minHeightRem).toBeGreaterThan(2);
    expect(estimateViewportShellMetrics(paragraph).estimatedLines).toBeGreaterThan(1);
    expect(estimateViewportShellMetrics(table).minHeightRem).toBeGreaterThan(
      estimateViewportShellMetrics(row).minHeightRem,
    );
    expect(estimateViewportShellMetrics(cell).minHeightRem).toBeGreaterThan(1.5);
  });

  it("creates lightweight shells for collapsed text blocks", () => {
    const doc = parseMarkdown("# Title\n\nParagraph\n\n- [x] Task");
    const heading = doc.firstChild;
    const paragraph = doc.child(1);
    const taskItem = doc.child(2).firstChild;

    if (!heading || !paragraph || !taskItem) {
      throw new Error("expected heading, paragraph, and task item");
    }

    const headingShell = describeViewportTextBlockShell(heading);
    const paragraphShell = describeViewportTextBlockShell(paragraph);
    const taskShell = describeViewportTextBlockShell(taskItem);

    expect(headingShell.nodeType).toBe("heading");
    expect(headingShell.headingLevel).toBe("1");
    expect(paragraphShell.nodeType).toBe("paragraph");
    expect(paragraphShell.text).toContain("Paragraph");
    expect(taskShell.nodeType).toBe("task_list_item");
    expect(taskShell.text.startsWith("[x]")).toBe(true);
  });

  it("debounces viewport measurement until scrolling settles", () => {
    vi.useFakeTimers();

    try {
      const callback = vi.fn();

      let handle = scheduleViewportScrollSettle(null, callback);
      vi.advanceTimersByTime(VIEWPORT_SCROLL_SETTLE_DELAY_MS - 1);
      expect(callback).not.toHaveBeenCalled();

      handle = scheduleViewportScrollSettle(handle, callback);
      vi.advanceTimersByTime(VIEWPORT_SCROLL_SETTLE_DELAY_MS - 1);
      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(callback).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses a larger scroll buffer so upcoming blocks are promoted before users see shell placeholders", () => {
    const viewportHeight = 720;
    const idleMarginPx = resolveViewportMeasureMarginPx(viewportHeight, false);
    const scrollMarginPx = resolveViewportMeasureMarginPx(viewportHeight, true);
    const upcomingBlock = {
      top: 1460,
      bottom: 1540,
    };

    expect(scrollMarginPx).toBeGreaterThan(idleMarginPx);
    expect(
      isViewportRectWithinMargin(
        upcomingBlock,
        0,
        viewportHeight,
        idleMarginPx,
      ),
    ).toBe(false);
    expect(
      isViewportRectWithinMargin(
        upcomingBlock,
        0,
        viewportHeight,
        scrollMarginPx,
      ),
    ).toBe(true);
  });

  it("prefers cached measured height over estimated shell height", () => {
    const doc = parseMarkdown("Paragraph with enough content to produce a shell estimate.");
    const paragraph = doc.firstChild;

    if (!paragraph) {
      throw new Error("expected paragraph");
    }

    const cacheKey = createViewportMeasurementCacheKey(
      "/tmp/blog.md",
      () => 4,
      paragraph,
    );
    rememberViewportMeasuredHeightPx(cacheKey, 148.5);

    expect(readViewportMeasuredHeightPx(cacheKey)).toBe(148.5);
    expect(resolveViewportShellMinHeightPx(paragraph, 148.5, 16)).toBe(148.5);
    expect(resolveViewportShellMinHeightPx(paragraph, null, 16)).toBeGreaterThan(0);
  });
});
