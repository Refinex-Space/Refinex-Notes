import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { formatRelativeTime, HistoryPanel } from "../HistoryPanel";

describe("HistoryPanel", () => {
  it("formats timestamps as relative time", () => {
    const now = new Date("2026-04-14T12:00:00Z").getTime();
    expect(formatRelativeTime(Math.floor(now / 1000) - 3600, now)).toContain("小时前");
  });

  it("renders an empty-state message when no file is open", () => {
    const markup = renderToStaticMarkup(<HistoryPanel currentFile={null} />);
    expect(markup).toContain("先从文件树中打开一篇 Markdown");
  });
});
