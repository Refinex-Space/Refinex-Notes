import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { FileNode } from "../../../types/notes";
import { FileTreeNodes } from "../FileTree";

describe("FileTree", () => {
  it("renders directories collapsed by default", () => {
    const files: FileNode[] = [
      {
        name: "Projects",
        path: "Projects",
        isDir: true,
        children: [
          {
            name: "Refinex",
            path: "Projects/Refinex",
            isDir: true,
            children: [
              {
                name: "Roadmap.md",
                path: "Projects/Refinex/Roadmap.md",
                isDir: false,
                gitStatus: "clean",
              },
            ],
          },
          {
            name: "Notes.md",
            path: "Projects/Notes.md",
            isDir: false,
            gitStatus: "clean",
          },
        ],
      },
    ];
    const markup = renderToStaticMarkup(
      <FileTreeNodes files={files} currentFile={null} />,
    );

    expect(markup).toContain("Projects");
    expect(markup).toContain('data-state="closed"');
    expect(markup).not.toContain('data-state="open"');
  });
});
