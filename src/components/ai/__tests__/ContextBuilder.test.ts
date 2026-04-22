import { describe, expect, it } from "vitest";

import type { FileNode } from "../../../types/notes";
import {
  buildAIContext,
  buildDirectoryTreeSummary,
  buildSystemPrompt,
  cursorPositionToOffset,
  sliceWindowAroundOffset,
} from "../ContextBuilder";

describe("ContextBuilder", () => {
  it("maps line and column positions into a character offset", () => {
    const content = "Alpha\nBeta\nGamma";

    expect(cursorPositionToOffset(content, { line: 2, col: 3 })).toBe(8);
    expect(cursorPositionToOffset(content, { line: 9, col: 99 })).toBe(
      content.length,
    );
  });

  it("builds a bounded document window around the cursor", () => {
    const excerpt = sliceWindowAroundOffset("0123456789", 5, 3);

    expect(excerpt).toEqual({
      start: 2,
      end: 8,
      excerpt: "...\n234567\n...",
    });
  });

  it("summarizes the directory tree and current document context into the system prompt", () => {
    const tree = [
      {
        name: "docs",
        path: "docs",
        isDir: true,
        hasChildren: true,
        isLoaded: true,
        children: [
          {
            name: "Roadmap.md",
            path: "docs/Roadmap.md",
            isDir: false,
            hasChildren: false,
            isLoaded: true,
          },
        ],
      },
    ] satisfies FileNode[];
    const context = buildAIContext({
      content: "# Roadmap\n\n## Phase 8\n\nShip AI chat panel.\n",
      filePath: "docs/Roadmap.md",
      cursorPosition: { line: 3, col: 4 },
      selectedText: "Phase 8",
      directoryTree: buildDirectoryTreeSummary(tree),
      openFiles: ["docs/Roadmap.md", "docs/Ideas.md"],
      recentFiles: ["docs/Ideas.md"],
    });
    const prompt = buildSystemPrompt(context);

    expect(prompt).toContain("你是 Refinex Notes 内置的 Refinex AI");
    expect(prompt).toContain("- 路径: docs/Roadmap.md");
    expect(prompt).toContain("Phase 8");
    expect(prompt).toContain("- Roadmap");
    expect(prompt).toContain("  - Phase 8");
    expect(prompt).toContain("docs/Ideas.md");
    expect(prompt).toContain("- docs/");
    expect(prompt).toContain("Roadmap.md");
  });
});
