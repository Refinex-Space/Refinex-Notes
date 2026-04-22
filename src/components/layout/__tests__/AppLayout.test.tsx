/**
 * @vitest-environment jsdom
 */

import { act } from "react";
import { createRoot } from "react-dom/client";
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
    expect(markup).toContain("border-b border-border/70");
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
      "relative min-h-0 min-w-0 bg-bg grid grid-rows-[auto_minmax(0,1fr)]",
    );
  });

  it("switches to a full-page center surface when fullPageContent is provided", () => {
    const markup = renderToStaticMarkup(
      <AppLayout
        sidebar={<div>sidebar</div>}
        tabBar={<div>tabs</div>}
        editor={<div>editor</div>}
        fullPageContent={<div>settings-surface</div>}
        rightPanel={<div>right</div>}
        statusBar={null}
      />,
    );

    expect(markup).toContain("settings-surface");
    expect(markup).toContain("grid-template-columns:0px minmax(0, 1fr) 0px");
    expect(markup).not.toContain(">tabs<");
    expect(markup).not.toContain("aria-label=\"设置\"");
  });

  it("detects mac platforms for titlebar inset handling", () => {
    expect(isMacLikePlatform("MacIntel", "")).toBe(true);
    expect(isMacLikePlatform("", "Mozilla/5.0 (Mac OS X 14_0)")).toBe(true);
    expect(isMacLikePlatform("Win32", "Mozilla/5.0 (Windows NT 10.0)")).toBe(
      false,
    );
  });

  it("clamps the right panel width so the AI panel cannot be narrowed past the safe minimum", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <AppLayout
          sidebar={<div>sidebar</div>}
          tabBar={<div>tabs</div>}
          editor={<div>editor</div>}
          aiPanel={<div>ai-panel</div>}
          rightPanel={<div>right</div>}
          statusBar={<div>status</div>}
          defaultRightPanelWidth={200}
        />,
      );
    });

    const aiToggle = container.querySelector('button[aria-label="AI 助手"]');
    const shellGrid = container.querySelector(".grid.min-h-0.flex-1.overflow-hidden");

    await act(async () => {
      aiToggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(shellGrid?.getAttribute("style")).toContain("360px");

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
