import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceSwitcher } from "../WorkspaceSwitcher";

describe("WorkspaceSwitcher", () => {
  it("renders current workspace and recent entries", () => {
    const markup = renderToStaticMarkup(
      <WorkspaceSwitcher
        workspacePath="/Users/refinex/workspaces/refinex-notes"
        recentWorkspaces={[
          {
            path: "/Users/refinex/workspaces/refinex-notes",
            lastOpened: 1_744_729_600,
          },
          {
            path: "/Users/refinex/workspaces/playground",
            lastOpened: 1_744_729_200,
          },
        ]}
        onOpenWorkspace={vi.fn()}
        onSelectWorkspace={vi.fn()}
        onRemoveWorkspace={vi.fn()}
      />,
    );

    expect(markup).toContain("refinex-notes");
    expect(markup).not.toContain("Users/refinex/workspaces");
  });

  it("shows open workspace label when no workspace is selected", () => {
    const markup = renderToStaticMarkup(
      <WorkspaceSwitcher
        workspacePath={null}
        recentWorkspaces={[]}
        onOpenWorkspace={vi.fn()}
        onSelectWorkspace={vi.fn()}
        onRemoveWorkspace={vi.fn()}
      />,
    );

    expect(markup).toContain("Open Workspace");
    expect(markup).not.toContain("最近工作区 / 本地目录");
  });
});
