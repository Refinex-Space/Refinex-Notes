import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { FileNode } from "../../../types/notes";
import { FileTreeEmptyState, FileTreeNodes, gitStatusTone } from "../FileTree";

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
    expect(markup).toContain("space-y-0.5 px-2 py-2");
    expect(markup).toContain("rounded-lg px-2.5 py-1 text-[13px] font-medium leading-[1.1rem]");
  });

  it("renders compact file rows", () => {
    const files: FileNode[] = [
      {
        name: "Notes.md",
        path: "Notes.md",
        isDir: false,
        gitStatus: "clean",
      },
    ];
    const markup = renderToStaticMarkup(
      <FileTreeNodes files={files} currentFile={null} />,
    );

    expect(markup).toContain(
      "flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1 text-left text-[13px] leading-[1.1rem] transition",
    );
  });

  it("maps modified files to amber text", () => {
    expect(gitStatusTone("modified")).toBe("text-amber-400");
    expect(gitStatusTone("untracked")).toBe("text-emerald-400");
  });

  it("renders a centered empty state without instructional copy", () => {
    const markup = renderToStaticMarkup(
      <FileTreeEmptyState workspacePath={null} />,
    );

    expect(markup).toContain("打开一个工作区");
    expect(markup).toContain("本地 Markdown / Git 仓库");
    expect(markup).not.toContain("点击上方按钮打开本地文件夹");
  });
});
