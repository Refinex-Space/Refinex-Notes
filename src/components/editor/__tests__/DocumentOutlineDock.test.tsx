import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  buildOutlineRailItems,
  DocumentOutlineDock,
} from "../DocumentOutlineDock";

describe("DocumentOutlineDock", () => {
  it("renders a floating reading guide for headings", () => {
    const markup = renderToStaticMarkup(
      <DocumentOutlineDock
        markdown={`# One

## Two

### Three`}
      />,
    );

    expect(markup).toContain("阅读指引");
    expect(markup).toContain("当前文档标题导航");
    expect(markup).toContain("aria-label=\"阅读指引\"");
    expect(markup).toContain("One");
    expect(markup).toContain("Two");
    expect(markup).toContain("Three");
  });

  it("returns no markup when the document has no headings", () => {
    const markup = renderToStaticMarkup(
      <DocumentOutlineDock markdown="plain paragraph only" />,
    );

    expect(markup).toBe("");
  });
});

describe("buildOutlineRailItems", () => {
  it("caps rail markers to a compact subset", () => {
    const headings = Array.from({ length: 40 }, (_, index) => ({
      id: `${index + 1}:heading-${index + 1}`,
      text: `Heading ${index + 1}`,
      level: (index % 4) + 1,
      line: index + 1,
    }));

    const railItems = buildOutlineRailItems(headings);

    expect(railItems.length).toBeLessThanOrEqual(24);
    expect(railItems[0]?.id).toBe("1:heading-1");
  });
});
