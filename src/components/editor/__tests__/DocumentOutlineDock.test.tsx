import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DocumentOutlineDock } from "../DocumentOutlineDock";

describe("DocumentOutlineDock", () => {
  it("renders prototype-style outline with 大纲 label and H2+ headings", () => {
    const markup = renderToStaticMarkup(
      <DocumentOutlineDock
        markdown={`# One

## Two

### Three`}
      />,
    );

    expect(markup).toContain("大纲");
    // H1 is NOT rendered
    expect(markup).not.toContain(">One<");
    // H2+ ARE rendered
    expect(markup).toContain("Two");
    expect(markup).toContain("Three");
  });

  it("returns no markup when the document has no H2+ headings", () => {
    const markup = renderToStaticMarkup(
      <DocumentOutlineDock markdown="# Title only" />,
    );

    expect(markup).toBe("");
  });

  it("returns no markup when the document has no headings", () => {
    const markup = renderToStaticMarkup(
      <DocumentOutlineDock markdown="plain paragraph only" />,
    );

    expect(markup).toBe("");
  });

  it("applies deeper indent for lower-level headings starting from H2", () => {
    const markup = renderToStaticMarkup(
      <DocumentOutlineDock
        markdown={`# H1

## H2

### H3`}
      />,
    );

    // H2 paddingLeft = 0.75rem (level-2=0, so 0.75 + 0*0.875)
    // H3 paddingLeft = 1.625rem (level-2=1, so 0.75 + 1*0.875)
    expect(markup).toContain("0.75rem");
    expect(markup).toContain("1.625rem");
  });
});
