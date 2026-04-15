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
  });

  it("detects mac platforms for titlebar inset handling", () => {
    expect(isMacLikePlatform("MacIntel", "")).toBe(true);
    expect(isMacLikePlatform("", "Mozilla/5.0 (Mac OS X 14_0)")).toBe(true);
    expect(isMacLikePlatform("Win32", "Mozilla/5.0 (Windows NT 10.0)")).toBe(false);
  });
});
