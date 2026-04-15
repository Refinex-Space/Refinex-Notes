import { describe, expect, it } from "vitest";

import type { FileNode } from "../../../types";
import {
  collectAccordionValues,
  extractOutlineHeadings,
  getDefaultCreateFilePath,
  getDefaultCreateFolderPath,
  getNodeDirectoryPath,
  isMarkdownPath,
} from "../sidebar-utils";

describe("sidebar helpers", () => {
  it("derives directory and creation targets for file and folder nodes", () => {
    const fileNode = {
      name: "Roadmap.md",
      path: "Projects/Refinex/Roadmap.md",
      isDir: false,
      hasChildren: false,
      isLoaded: true,
    } satisfies FileNode;
    const folderNode = {
      name: "Refinex",
      path: "Projects/Refinex",
      isDir: true,
      hasChildren: false,
      isLoaded: true,
      children: [],
    } satisfies FileNode;

    expect(getNodeDirectoryPath(fileNode)).toBe("Projects/Refinex");
    expect(getNodeDirectoryPath(folderNode)).toBe("Projects/Refinex");
    expect(getDefaultCreateFilePath(fileNode)).toBe("Projects/Refinex/Untitled.md");
    expect(getDefaultCreateFolderPath(folderNode)).toBe("Projects/Refinex/New Folder");
  });

  it("collects accordion values for all folder nodes", () => {
    const tree = [
      {
        name: "Projects",
        path: "Projects",
        isDir: true,
        hasChildren: true,
        isLoaded: true,
        children: [
          {
            name: "Refinex",
            path: "Projects/Refinex",
            isDir: true,
            hasChildren: true,
            isLoaded: true,
            children: [
              {
                name: "Roadmap.md",
                path: "Projects/Refinex/Roadmap.md",
                isDir: false,
                hasChildren: false,
                isLoaded: true,
              },
            ],
          },
        ],
      },
    ] satisfies FileNode[];

    expect(collectAccordionValues(tree)).toEqual([
      "Projects",
      "Projects/Refinex",
    ]);
  });

  it("extracts outline headings with levels and line numbers", () => {
    const headings = extractOutlineHeadings(`# One

Intro

## Two

### Three
`);

    expect(headings).toEqual([
      {
        id: "1:one",
        text: "One",
        level: 1,
        line: 1,
      },
      {
        id: "5:two",
        text: "Two",
        level: 2,
        line: 5,
      },
      {
        id: "7:three",
        text: "Three",
        level: 3,
        line: 7,
      },
    ]);
  });

  it("recognizes markdown paths", () => {
    expect(isMarkdownPath("Inbox/Welcome.md")).toBe(true);
    expect(isMarkdownPath("Inbox/image.png")).toBe(false);
  });
});
