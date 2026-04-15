import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GitOverviewPanel } from "../GitOverviewPanel";

describe("GitOverviewPanel", () => {
  it("renders a clean repo summary", () => {
    const markup = renderToStaticMarkup(
      <GitOverviewPanel
        syncStatus="synced"
        syncDetail="工作区已同步"
        changedFiles={[]}
      />,
    );

    expect(markup).toContain("仓库已同步");
    expect(markup).toContain("当前工作区没有待处理变更");
  });

  it("renders changed files when the repo is dirty", () => {
    const markup = renderToStaticMarkup(
      <GitOverviewPanel
        syncStatus="dirty"
        syncDetail="2 个文件有待同步改动"
        changedFiles={[
          { path: "Inbox/Welcome.md", status: "modified", staged: false, unstaged: true },
          { path: "Daily/2026-04-15.md", status: "added", staged: true, unstaged: false },
        ]}
      />,
    );

    expect(markup).toContain("2 个变更待处理");
    expect(markup).toContain("Staged");
    expect(markup).toContain("Unstaged");
    expect(markup).toContain(">1<");
    expect(markup).toContain("Inbox/Welcome.md");
    expect(markup).toContain("modified");
    expect(markup).toContain("Daily/2026-04-15.md");
    expect(markup).toContain("added");
  });
});
