import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import type { FileNode, NoteDocument, NoteStore } from "../types/notes";

const MOCK_DOCUMENTS: NoteDocument[] = [
  {
    path: "Inbox/Welcome.md",
    name: "Welcome.md",
    content: `# Welcome to Refinex Notes

## Capture ideas fast

Refinex keeps your notes, tasks, and AI workflows in one workspace.

## Current focus

- Build the application shell
- Connect the Rust file backend
- Prepare multi-tab editing
`,
    savedContent: `# Welcome to Refinex Notes

## Capture ideas fast

Refinex keeps your notes, tasks, and AI workflows in one workspace.

## Current focus

- Build the application shell
- Connect the Rust file backend
- Prepare multi-tab editing
`,
    language: "Markdown",
    gitStatus: "clean",
    isMarkdown: true,
  },
  {
    path: "Daily/2026-04-13.md",
    name: "2026-04-13.md",
    content: `# 2026-04-13

## Wins

- Finished rich editor UI surfaces
- Started the application shell

## Next

- File tree
- Status bar
- Command palette
`,
    savedContent: `# 2026-04-13

## Wins

- Finished rich editor UI surfaces
- Started the application shell

## Next

- File tree
- Status bar
- Command palette
`,
    language: "Markdown",
    gitStatus: "modified",
    isMarkdown: true,
  },
  {
    path: "Projects/Refinex/Roadmap.md",
    name: "Roadmap.md",
    content: `# Product Roadmap

## Phase 4

Build the application shell and the native file foundation.

## Phase 5

Wire real file system events and Git state.
`,
    savedContent: `# Product Roadmap

## Phase 4

Build the application shell and the native file foundation.

## Phase 5

Wire real file system events and Git state.
`,
    language: "Markdown",
    gitStatus: "added",
    isMarkdown: true,
  },
  {
    path: "Projects/Refinex/Meeting-Notes.md",
    name: "Meeting-Notes.md",
    content: `# Meeting Notes

## Decisions

- Keep editor core in \`src/editor/\`
- Build shell UI in \`src/components/\`
`,
    savedContent: `# Meeting Notes

## Decisions

- Keep editor core in \`src/editor/\`
- Build shell UI in \`src/components/\`
`,
    language: "Markdown",
    gitStatus: "clean",
    isMarkdown: true,
  },
  {
    path: "Archive/Deprecated.md",
    name: "Deprecated.md",
    content: `# Deprecated

Legacy note kept for shell state testing.
`,
    savedContent: `# Deprecated

Legacy note kept for shell state testing.
`,
    language: "Markdown",
    gitStatus: "deleted",
    isMarkdown: true,
  },
];

const MOCK_FOLDERS = [
  "Inbox",
  "Daily",
  "Projects",
  "Projects/Refinex",
  "Archive",
] as const;

const DEFAULT_CURRENT_FILE = "Inbox/Welcome.md";

type StoreState = Pick<
  NoteStore,
  "files" | "documents" | "folders" | "currentFile" | "openFiles" | "recentFiles"
>;

type TreeNode = FileNode & { children?: TreeNode[] };

function cloneDocument(document: NoteDocument): NoteDocument {
  return { ...document };
}

function createDocumentMap(documents: readonly NoteDocument[]) {
  return Object.fromEntries(
    documents.map((document) => [document.path, cloneDocument(document)]),
  ) as Record<string, NoteDocument>;
}

function getParentDirectories(path: string) {
  const segments = path.split("/").filter(Boolean);
  return segments
    .slice(0, -1)
    .map((_, index) => segments.slice(0, index + 1).join("/"));
}

function getFileName(path: string) {
  const segments = path.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? path;
}

function sortTree(nodes: TreeNode[]): FileNode[] {
  return [...nodes]
    .sort((left, right) => {
      if (left.isDir !== right.isDir) {
        return left.isDir ? -1 : 1;
      }
      return left.name.localeCompare(right.name, "en");
    })
    .map((node) => ({
      ...node,
      children: node.children ? sortTree(node.children) : undefined,
    }));
}

export function buildFileTree(
  folders: readonly string[],
  documents: Record<string, NoteDocument>,
): FileNode[] {
  const root: TreeNode[] = [];

  const explicitFolders = new Set<string>(folders);
  for (const path of Object.keys(documents)) {
    for (const folder of getParentDirectories(path)) {
      explicitFolders.add(folder);
    }
  }

  const ensureDirectory = (path: string) => {
    const segments = path.split("/").filter(Boolean);
    let siblings = root;
    let currentPath = "";

    for (const segment of segments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      let node = siblings.find(
        (entry) => entry.isDir && entry.name === segment && entry.path === currentPath,
      );

      if (!node) {
        node = {
          name: segment,
          path: currentPath,
          isDir: true,
          children: [],
        };
        siblings.push(node);
      }

      if (!node.children) {
        node.children = [];
      }
      siblings = node.children;
    }

    return siblings;
  };

  for (const folder of Array.from(explicitFolders).sort()) {
    ensureDirectory(folder);
  }

  for (const document of Object.values(documents)) {
    const parentPath = getParentDirectories(document.path).at(-1);
    const siblings = parentPath ? ensureDirectory(parentPath) : root;

    if (!siblings.some((entry) => entry.path === document.path && !entry.isDir)) {
      siblings.push({
        name: document.name,
        path: document.path,
        isDir: false,
        gitStatus: document.gitStatus,
      });
    }
  }

  return sortTree(root);
}

function createInitialState(): StoreState {
  const documents = createDocumentMap(MOCK_DOCUMENTS);
  const folders = [...MOCK_FOLDERS];

  return {
    files: buildFileTree(folders, documents),
    documents,
    folders,
    currentFile: DEFAULT_CURRENT_FILE,
    openFiles: [DEFAULT_CURRENT_FILE],
    recentFiles: [DEFAULT_CURRENT_FILE],
  };
}

function ensureUniquePaths(paths: readonly string[]) {
  return Array.from(new Set(paths));
}

function withRecentFile(recentFiles: readonly string[], path: string) {
  return [path, ...recentFiles.filter((entry) => entry !== path)].slice(0, 8);
}

function renamePrefix(path: string, oldPath: string, newPath: string) {
  if (path === oldPath) {
    return newPath;
  }

  const prefix = `${oldPath}/`;
  if (!path.startsWith(prefix)) {
    return path;
  }

  return `${newPath}/${path.slice(prefix.length)}`;
}

function createMarkdownTemplate(path: string) {
  const title = getFileName(path).replace(/\.md$/i, "");
  return `# ${title}\n\n`;
}

function isDirectoryPath(path: string, state: StoreState) {
  return (
    state.folders.includes(path) ||
    Object.keys(state.documents).some((entry) => entry.startsWith(`${path}/`))
  );
}

function syncFileTree(state: StoreState) {
  state.files = buildFileTree(state.folders, state.documents);
}

export function resetNoteStore() {
  useNoteStore.setState(createInitialState());
}

export const useNoteStore = create<NoteStore>()(
  immer((set) => ({
    ...createInitialState(),
    openFile: async (path) => {
      set((state) => {
        if (!state.documents[path]) {
          return;
        }
        state.currentFile = path;
        state.openFiles = ensureUniquePaths([...state.openFiles, path]);
        state.recentFiles = withRecentFile(state.recentFiles, path);
      });
    },
    closeFile: async (path) => {
      set((state) => {
        const index = state.openFiles.indexOf(path);
        if (index === -1) {
          return;
        }

        state.openFiles = state.openFiles.filter((entry) => entry !== path);
        if (state.currentFile !== path) {
          return;
        }

        const nextPath =
          state.openFiles[index] ??
          state.openFiles[index - 1] ??
          state.openFiles[0] ??
          null;
        state.currentFile = nextPath;
      });
    },
    createFile: async (path) => {
      set((state) => {
        if (state.documents[path]) {
          state.currentFile = path;
          state.openFiles = ensureUniquePaths([...state.openFiles, path]);
          state.recentFiles = withRecentFile(state.recentFiles, path);
          return;
        }

        const document: NoteDocument = {
          path,
          name: getFileName(path),
          content: createMarkdownTemplate(path),
          savedContent: createMarkdownTemplate(path),
          language: "Markdown",
          gitStatus: "untracked",
          isMarkdown: /\.md$/i.test(path),
        };

        state.documents[path] = document;
        state.folders = ensureUniquePaths([
          ...state.folders,
          ...getParentDirectories(path),
        ]);
        state.currentFile = path;
        state.openFiles = ensureUniquePaths([...state.openFiles, path]);
        state.recentFiles = withRecentFile(state.recentFiles, path);
        syncFileTree(state);
      });
    },
    createFolder: async (path) => {
      set((state) => {
        if (state.folders.includes(path)) {
          return;
        }
        state.folders = ensureUniquePaths([...state.folders, ...getParentDirectories(path), path]);
        syncFileTree(state);
      });
    },
    deleteFile: async (path) => {
      set((state) => {
        if (state.documents[path]) {
          delete state.documents[path];
        }

        if (isDirectoryPath(path, state)) {
          for (const documentPath of Object.keys(state.documents)) {
            if (documentPath.startsWith(`${path}/`)) {
              delete state.documents[documentPath];
            }
          }

          state.folders = state.folders.filter(
            (folder) => folder !== path && !folder.startsWith(`${path}/`),
          );
        }

        state.openFiles = state.openFiles.filter(
          (entry) => entry !== path && !entry.startsWith(`${path}/`),
        );
        state.recentFiles = state.recentFiles.filter(
          (entry) => entry !== path && !entry.startsWith(`${path}/`),
        );

        if (state.currentFile === path || state.currentFile?.startsWith(`${path}/`)) {
          state.currentFile = state.openFiles[0] ?? null;
        }

        syncFileTree(state);
      });
    },
    renameFile: async (oldPath, newPath) => {
      set((state) => {
        const nextDocuments = Object.fromEntries(
          Object.values(state.documents).map((document) => {
            const path = renamePrefix(document.path, oldPath, newPath);
            return [
              path,
              {
                ...document,
                path,
                name: getFileName(path),
              },
            ] as const;
          }),
        ) as Record<string, NoteDocument>;

        state.documents = nextDocuments;
        state.folders = ensureUniquePaths(
          state.folders.map((folder) => renamePrefix(folder, oldPath, newPath)),
        );
        state.openFiles = state.openFiles.map((path) =>
          renamePrefix(path, oldPath, newPath),
        );
        state.recentFiles = state.recentFiles.map((path) =>
          renamePrefix(path, oldPath, newPath),
        );
        state.currentFile = state.currentFile
          ? renamePrefix(state.currentFile, oldPath, newPath)
          : null;
        syncFileTree(state);
      });
    },
    refreshFileTree: async () => {
      set((state) => {
        syncFileTree(state);
      });
    },
    updateFileContent: (path, content) => {
      set((state) => {
        if (!state.documents[path]) {
          return;
        }

        state.documents[path] = {
          ...state.documents[path],
          content,
        };
      });
    },
  })),
);

export function getCurrentDocument() {
  const { currentFile, documents } = useNoteStore.getState();
  return currentFile ? documents[currentFile] ?? null : null;
}
