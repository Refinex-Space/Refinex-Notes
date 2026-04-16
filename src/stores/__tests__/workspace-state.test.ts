import { beforeEach, describe, expect, it, vi } from "vitest";

import { fileService } from "../../services/fileService";
import type { FileNode } from "../../types";
import type { NoteDocument } from "../../types/notes";
import { resetEditorStore, useEditorStore } from "../editorStore";
import {
  buildFileTree,
  getCurrentDocument,
  resetNoteStore,
  useNoteStore,
} from "../noteStore";

vi.mock("../../services/fileService", () => ({
  fileService: {
    isNativeAvailable: vi.fn(() => false),
    selectWorkspace: vi.fn(),
    openWorkspace: vi.fn(),
    closeWorkspace: vi.fn(),
    listRecentWorkspaces: vi.fn(),
    removeRecentWorkspace: vi.fn(),
    readFileTree: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    createFile: vi.fn(),
    createDir: vi.fn(),
    deleteFile: vi.fn(),
    renameFile: vi.fn(),
    onFilesChanged: vi.fn(),
  },
}));

function createTestDocument(
  path: string,
  gitStatus: NoteDocument["gitStatus"] = "clean",
): NoteDocument {
  const name = path.split("/").at(-1) ?? path;
  return {
    path,
    name,
    content: `# ${name}`,
    savedContent: `# ${name}`,
    language: "Markdown",
    gitStatus,
    isMarkdown: true,
  };
}

function seedWorkspaceState() {
  const documents = {
    "Inbox/Welcome.md": createTestDocument("Inbox/Welcome.md"),
    "Daily/2026-04-13.md": createTestDocument("Daily/2026-04-13.md", "modified"),
    "Projects/Refinex/Roadmap.md": createTestDocument(
      "Projects/Refinex/Roadmap.md",
      "added",
    ),
  } satisfies Record<string, NoteDocument>;
  const folders = ["Inbox", "Daily", "Projects", "Projects/Refinex"];

  useNoteStore.setState({
    workspacePath: null,
    documents,
    folders,
    files: buildFileTree(folders, documents),
    currentFile: "Inbox/Welcome.md",
    openFiles: ["Inbox/Welcome.md"],
    recentFiles: ["Inbox/Welcome.md"],
    openingFiles: [],
  });
}

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
    vi.clearAllMocks();
    seedWorkspaceState();
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

  it("reopens cached workspace documents without hitting disk again", async () => {
    useNoteStore.setState({
      workspacePath: "/tmp/workspace",
      currentFile: null,
      openFiles: [],
    });

    await useNoteStore.getState().openFile("Inbox/Welcome.md");

    expect(vi.mocked(fileService.readFile)).not.toHaveBeenCalled();
    expect(useNoteStore.getState().currentFile).toBe("Inbox/Welcome.md");
    expect(useNoteStore.getState().openFiles).toEqual(["Inbox/Welcome.md"]);
  });

  it("switches to the target file immediately while the workspace read is still pending", async () => {
    let resolveRead!: (content: string) => void;
    vi.mocked(fileService.readFile).mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          resolveRead = resolve;
        }),
    );

    useNoteStore.setState({
      workspacePath: "/tmp/workspace",
      documents: {},
      currentFile: null,
      openFiles: [],
      recentFiles: [],
      openingFiles: [],
    });

    const openPromise = useNoteStore.getState().openFile("Inbox/Welcome.md");

    expect(useNoteStore.getState().currentFile).toBe("Inbox/Welcome.md");
    expect(useNoteStore.getState().openFiles).toEqual(["Inbox/Welcome.md"]);
    expect(useNoteStore.getState().openingFiles).toEqual(["Inbox/Welcome.md"]);

    resolveRead("# Welcome");
    await openPromise;

    expect(useNoteStore.getState().documents["Inbox/Welcome.md"]?.content).toBe(
      "# Welcome",
    );
    expect(useNoteStore.getState().openingFiles).toEqual([]);
  });

  it("reuses the in-flight workspace read for repeated opens of the same path", async () => {
    let resolveRead!: (content: string) => void;
    vi.mocked(fileService.readFile).mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          resolveRead = resolve;
        }),
    );

    useNoteStore.setState({
      workspacePath: "/tmp/workspace",
      documents: {},
      currentFile: null,
      openFiles: [],
      recentFiles: [],
      openingFiles: [],
    });

    const firstOpen = useNoteStore.getState().openFile("Inbox/Welcome.md");
    const secondOpen = useNoteStore.getState().openFile("Inbox/Welcome.md");

    expect(fileService.readFile).toHaveBeenCalledTimes(1);
    expect(useNoteStore.getState().openingFiles).toEqual(["Inbox/Welcome.md"]);

    resolveRead("# Welcome");
    await Promise.all([firstOpen, secondOpen]);

    expect(useNoteStore.getState().documents["Inbox/Welcome.md"]?.content).toBe(
      "# Welcome",
    );
    expect(useNoteStore.getState().openingFiles).toEqual([]);
  });

  it("reorders tabs and supports bulk-close actions", async () => {
    await useNoteStore.getState().openFile("Daily/2026-04-13.md");
    await useNoteStore.getState().openFile("Projects/Refinex/Roadmap.md");

    useNoteStore
      .getState()
      .reorderOpenFiles("Projects/Refinex/Roadmap.md", 0);

    expect(useNoteStore.getState().openFiles).toEqual([
      "Projects/Refinex/Roadmap.md",
      "Inbox/Welcome.md",
      "Daily/2026-04-13.md",
    ]);

    await useNoteStore.getState().closeFilesToRight("Inbox/Welcome.md");

    expect(useNoteStore.getState().openFiles).toEqual([
      "Projects/Refinex/Roadmap.md",
      "Inbox/Welcome.md",
    ]);
    expect(useNoteStore.getState().currentFile).toBe("Inbox/Welcome.md");

    await useNoteStore.getState().openFile("Daily/2026-04-13.md");
    await useNoteStore.getState().closeFilesToLeft("Daily/2026-04-13.md");

    expect(useNoteStore.getState().openFiles).toEqual(["Daily/2026-04-13.md"]);
    expect(useNoteStore.getState().currentFile).toBe("Daily/2026-04-13.md");

    await useNoteStore.getState().openFile("Projects/Refinex/Roadmap.md");
    await useNoteStore
      .getState()
      .closeOtherFiles("Projects/Refinex/Roadmap.md");

    expect(useNoteStore.getState().openFiles).toEqual([
      "Projects/Refinex/Roadmap.md",
    ]);
    expect(useNoteStore.getState().currentFile).toBe(
      "Projects/Refinex/Roadmap.md",
    );

    await useNoteStore.getState().closeAllFiles();

    expect(useNoteStore.getState().openFiles).toEqual([]);
    expect(useNoteStore.getState().currentFile).toBeNull();
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
