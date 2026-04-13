import { describe, expect, it } from "vitest";

import { parseMarkdown } from "../../editor";
import {
  buildCommandPaletteItems,
  countWords,
  createNextNotePath,
  findHeadingPosition,
} from "../app-shell-utils";

describe("app shell helpers", () => {
  it("counts words from markdown content", () => {
    expect(countWords("one two\n\nthree")).toBe(3);
    expect(countWords("")).toBe(0);
  });

  it("builds command palette file items from documents", () => {
    const items = buildCommandPaletteItems({
      "Inbox/Welcome.md": {
        path: "Inbox/Welcome.md",
        name: "Welcome.md",
        content: "",
        savedContent: "",
        language: "Markdown",
        gitStatus: "clean",
        isMarkdown: true,
      },
      "Projects/Refinex/Roadmap.md": {
        path: "Projects/Refinex/Roadmap.md",
        name: "Roadmap.md",
        content: "",
        savedContent: "",
        language: "Markdown",
        gitStatus: "modified",
        isMarkdown: true,
      },
    });

    expect(items.map((item) => item.id)).toEqual([
      "file:Inbox/Welcome.md",
      "file:Projects/Refinex/Roadmap.md",
    ]);
    expect(items[1].description).toBe("Projects/Refinex/Roadmap.md");
  });

  it("creates the next quick note path without collisions", () => {
    expect(createNextNotePath([])).toBe("Inbox/Quick Note.md");
    expect(
      createNextNotePath(["Inbox/Quick Note.md", "Inbox/Quick Note 2.md"]),
    ).toBe("Inbox/Quick Note 3.md");
  });

  it("finds the heading position inside the editor document", () => {
    const doc = parseMarkdown(`# One

## Two

### Three
`);

    expect(findHeadingPosition(doc, { text: "Two", level: 2 })).toBe(5);
    expect(findHeadingPosition(doc, { text: "Missing", level: 2 })).toBeNull();
  });
});
