import { beforeEach, describe, expect, it } from "vitest";

import type { FileNode } from "../../types";
import { resetEditorStore, useEditorStore } from "../editorStore";
import {
  buildFileTree,
  getCurrentDocument,
  resetNoteStore,
  useNoteStore,
} from "../noteStore";

function flattenTree(paths: string[], nodes: FileNode[]) {
  for (const node of nodes) {
    paths.push(node.path);
    if (node.children) {
      flattenTree(paths, node.children);
    }
  }
  return paths;
}

describe("workspace state stores", () => {
  beforeEach(() => {
    resetNoteStore();
    resetEditorStore();
  });

  it("opens files, tracks recents, and closes the active tab predictably", async () => {
    await useNoteStore.getState().openFile("Daily/2026-04-13.md");
    await useNoteStore.getState().openFile("Projects/Refinex/Roadmap.md");

    expect(useNoteStore.getState().currentFile).toBe("Projects/Refinex/Roadmap.md");
    expect(useNoteStore.getState().openFiles).toEqual([
      "Inbox/Welcome.md",
      "Daily/2026-04-13.md",
      "Projects/Refinex/Roadmap.md",
    ]);
    expect(useNoteStore.getState().recentFiles.slice(0, 3)).toEqual([
      "Projects/Refinex/Roadmap.md",
      "Daily/2026-04-13.md",
      "Inbox/Welcome.md",
    ]);

    await useNoteStore.getState().closeFile("Projects/Refinex/Roadmap.md");

    expect(useNoteStore.getState().currentFile).toBe("Daily/2026-04-13.md");
    expect(useNoteStore.getState().openFiles).toEqual([
      "Inbox/Welcome.md",
      "Daily/2026-04-13.md",
    ]);
  });

  it("creates, renames, and deletes mock folders and files", async () => {
    await useNoteStore.getState().createFolder("Projects/Archive");
    await useNoteStore.getState().createFile("Projects/Archive/Notes.md");

    expect(useNoteStore.getState().documents["Projects/Archive/Notes.md"]).toBeDefined();
    expect(useNoteStore.getState().folders).toContain("Projects/Archive");

    await useNoteStore
      .getState()
      .renameFile("Projects/Archive", "Projects/History");

    expect(useNoteStore.getState().documents["Projects/History/Notes.md"]).toBeDefined();
    expect(useNoteStore.getState().documents["Projects/Archive/Notes.md"]).toBeUndefined();
    expect(useNoteStore.getState().folders).toContain("Projects/History");

    await useNoteStore.getState().deleteFile("Projects/History");

    expect(useNoteStore.getState().documents["Projects/History/Notes.md"]).toBeUndefined();
    expect(useNoteStore.getState().folders).not.toContain("Projects/History");
  });

  it("updates file content and exposes the active document", () => {
    useNoteStore
      .getState()
      .updateFileContent("Inbox/Welcome.md", "# Updated\n\nA changed note.");

    expect(getCurrentDocument()?.content).toBe("# Updated\n\nA changed note.");
  });

  it("builds a stable folder-first tree from folders and documents", () => {
    const tree = buildFileTree(
      ["Root", "Root/Projects"],
      {
        "Root/alpha.md": {
          path: "Root/alpha.md",
          name: "alpha.md",
          content: "",
          savedContent: "",
          language: "Markdown",
          gitStatus: "clean",
          isMarkdown: true,
        },
        "Root/Projects/beta.md": {
          path: "Root/Projects/beta.md",
          name: "beta.md",
          content: "",
          savedContent: "",
          language: "Markdown",
          gitStatus: "modified",
          isMarkdown: true,
        },
      },
    );

    expect(flattenTree([], tree)).toEqual([
      "Root",
      "Root/Projects",
      "Root/Projects/beta.md",
      "Root/alpha.md",
    ]);
  });

  it("tracks active tab, dirty markers, and cursor position", () => {
    useEditorStore.getState().setActiveTab("Projects/Refinex/Roadmap.md");
    useEditorStore.getState().markDirty("Projects/Refinex/Roadmap.md");
    useEditorStore.getState().setCursorPosition({ line: 12, col: 8 });

    expect(useEditorStore.getState().activeTab).toBe("Projects/Refinex/Roadmap.md");
    expect(
      useEditorStore.getState().unsavedChanges.has("Projects/Refinex/Roadmap.md"),
    ).toBe(true);
    expect(useEditorStore.getState().cursorPosition).toEqual({ line: 12, col: 8 });

    useEditorStore.getState().markClean("Projects/Refinex/Roadmap.md");

    expect(
      useEditorStore.getState().unsavedChanges.has("Projects/Refinex/Roadmap.md"),
    ).toBe(false);
  });
});
