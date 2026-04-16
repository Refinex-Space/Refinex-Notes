import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AppLayout, isMacLikePlatform } from "../AppLayout";

describe("AppLayout", () => {
  it("constrains the shell to viewport height and pane-local scrolling", () => {
    const markup = renderToStaticMarkup(
      <AppLayout
        sidebar={<div>sidebar</div>}
        tabBar={<div>tabs</div>}
        editor={<div>editor</div>}
        rightPanel={<div>right</div>}
        statusBar={<div>status</div>}
      />,
    );

    expect(markup).toContain("h-screen");
    expect(markup).toContain("overflow-hidden");
    expect(markup).toContain("grid min-h-0 flex-1 overflow-hidden");
    expect(markup).toContain("min-h-0 flex-1 overflow-hidden");
    expect(markup).toContain("px-2.5 py-1.5");
  });

  it("still renders editor content when the right panel starts collapsed", () => {
    const markup = renderToStaticMarkup(
      <AppLayout
        sidebar={<div>sidebar</div>}
        tabBar={<div>tabs</div>}
        editor={<div>empty-editor-state</div>}
        rightPanel={<div>right</div>}
        statusBar={<div>status</div>}
      />,
    );

    expect(markup).toContain("empty-editor-state");
    expect(markup).toContain("grid-template-columns:240px minmax(0, 1fr) 0px");
  });

  it("keeps each pane shrinkable so wide editor content cannot push the sidebar away", () => {
    const markup = renderToStaticMarkup(
      <AppLayout
        sidebar={<div>sidebar</div>}
        tabBar={<div>tabs</div>}
        editor={<div>editor</div>}
        rightPanel={<div>right</div>}
        statusBar={<div>status</div>}
      />,
    );

    expect(markup).toContain("h-full min-h-0 min-w-0 overflow-hidden");
    expect(markup).toContain(
      "relative grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] bg-bg",
    );
  });

  it("detects mac platforms for titlebar inset handling", () => {
    expect(isMacLikePlatform("MacIntel", "")).toBe(true);
    expect(isMacLikePlatform("", "Mozilla/5.0 (Mac OS X 14_0)")).toBe(true);
    expect(isMacLikePlatform("Win32", "Mozilla/5.0 (Windows NT 10.0)")).toBe(false);
  });
});
