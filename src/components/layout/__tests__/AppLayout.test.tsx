import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AppLayout } from "../AppLayout";

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
    expect(markup).toContain("min-h-0 flex-1 overflow-auto");
  });
});
