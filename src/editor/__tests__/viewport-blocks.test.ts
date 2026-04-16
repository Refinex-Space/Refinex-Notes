import { Decoration } from "prosemirror-view";
import { describe, expect, it } from "vitest";

import { parseMarkdown } from "../parser";
import {
  isViewportBlockVisible,
  isViewportTextBlockNode,
  summarizeViewportText,
} from "../plugins/viewport-blocks";
import { describeViewportTextBlockShell } from "../node-views/ViewportTextBlockView";

describe("viewport blocks helpers", () => {
  it("recognizes paragraph and heading as viewport text blocks", () => {
    const doc = parseMarkdown("# Title\n\nParagraph");
    const heading = doc.firstChild;
    const paragraph = doc.lastChild;
    const codeDoc = parseMarkdown("```ts\nconst value = 1;\n```");
    const codeBlock = codeDoc.firstChild;

    expect(heading && isViewportTextBlockNode(heading)).toBe(true);
    expect(paragraph && isViewportTextBlockNode(paragraph)).toBe(true);
    expect(codeBlock && isViewportTextBlockNode(codeBlock)).toBe(false);
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

  it("creates lightweight shells for collapsed text blocks", () => {
    const doc = parseMarkdown("# Title\n\nParagraph");
    const heading = doc.firstChild;
    const paragraph = doc.lastChild;

    if (!heading || !paragraph) {
      throw new Error("expected heading and paragraph");
    }

    const headingShell = describeViewportTextBlockShell(heading);
    const paragraphShell = describeViewportTextBlockShell(paragraph);

    expect(headingShell.nodeType).toBe("heading");
    expect(headingShell.headingLevel).toBe("1");
    expect(paragraphShell.nodeType).toBe("paragraph");
    expect(paragraphShell.text).toContain("Paragraph");
  });
});
