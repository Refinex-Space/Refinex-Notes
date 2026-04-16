import { Decoration } from "prosemirror-view";
import { describe, expect, it } from "vitest";

import { parseMarkdown } from "../parser";
import {
  isViewportBlockVisible,
  isViewportSkeletonNode,
  summarizeViewportText,
} from "../plugins/viewport-blocks";
import { describeViewportTextBlockShell } from "../node-views/ViewportTextBlockView";

describe("viewport blocks helpers", () => {
  it("recognizes supported blocks as viewport skeleton nodes", () => {
    const doc = parseMarkdown("# Title\n\nParagraph\n\n> Quote\n\n- Item\n- [x] Task");
    const heading = doc.firstChild;
    const paragraph = doc.child(1);
    const blockquote = doc.child(2);
    const bulletList = doc.child(3);
    const listItem = bulletList.firstChild;
    const taskItem = bulletList.lastChild;
    const codeDoc = parseMarkdown("```ts\nconst value = 1;\n```");
    const codeBlock = codeDoc.firstChild;

    expect(heading && isViewportSkeletonNode(heading)).toBe(true);
    expect(paragraph && isViewportSkeletonNode(paragraph)).toBe(true);
    expect(blockquote && isViewportSkeletonNode(blockquote)).toBe(true);
    expect(listItem && isViewportSkeletonNode(listItem)).toBe(true);
    expect(taskItem && isViewportSkeletonNode(taskItem)).toBe(true);
    expect(codeBlock && isViewportSkeletonNode(codeBlock)).toBe(false);
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
    const doc = parseMarkdown("# Title\n\nParagraph\n\n- [x] Task");
    const heading = doc.firstChild;
    const paragraph = doc.child(1);
    const taskItem = doc.child(2).firstChild;

    if (!heading || !paragraph || !taskItem) {
      throw new Error("expected heading, paragraph, and task item");
    }

    const headingShell = describeViewportTextBlockShell(heading);
    const paragraphShell = describeViewportTextBlockShell(paragraph);
    const taskShell = describeViewportTextBlockShell(taskItem);

    expect(headingShell.nodeType).toBe("heading");
    expect(headingShell.headingLevel).toBe("1");
    expect(paragraphShell.nodeType).toBe("paragraph");
    expect(paragraphShell.text).toContain("Paragraph");
    expect(taskShell.nodeType).toBe("task_list_item");
    expect(taskShell.text.startsWith("[x]")).toBe(true);
  });
});
