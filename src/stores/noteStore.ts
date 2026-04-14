import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { fileService } from "../services/fileService";
import type { FileNode, NoteDocument, NoteStore } from "../types/notes";
import { useEditorStore } from "./editorStore";

type StoreState = Pick<
  NoteStore,
  | "workspacePath"
  | "files"
  | "documents"
  | "folders"
  | "currentFile"
  | "openFiles"
  | "recentFiles"
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
  return {
    workspacePath: null,
    files: [],
    documents: {},
    folders: [],
    currentFile: null,
    openFiles: [],
    recentFiles: [],
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

function collectWorkspaceState(
  nodes: readonly FileNode[],
  folders: string[] = [],
  files: string[] = [],
) {
  for (const node of nodes) {
    if (node.isDir) {
      folders.push(node.path);
      collectWorkspaceState(node.children ?? [], folders, files);
      continue;
    }

    files.push(node.path);
  }

  return {
    folders,
    files,
  };
}

function createDocumentFromDisk(path: string, content: string): NoteDocument {
  return {
    path,
    name: getFileName(path),
    content,
    savedContent: content,
    language: /\.md$/i.test(path) ? "Markdown" : "Text",
    gitStatus: "clean",
    isMarkdown: /\.md$/i.test(path),
  };
}

function applyWorkspaceTree(state: StoreState, workspacePath: string, files: FileNode[]) {
  const workspaceState = collectWorkspaceState(files);
  const existingFiles = new Set(workspaceState.files);

  state.workspacePath = workspacePath;
  state.files = files;
  state.folders = workspaceState.folders;
  state.documents = Object.fromEntries(
    Object.entries(state.documents).filter(([path]) => existingFiles.has(path)),
  );
  state.openFiles = state.openFiles.filter((path) => existingFiles.has(path));
  state.recentFiles = state.recentFiles.filter((path) => existingFiles.has(path));

  if (state.currentFile && !existingFiles.has(state.currentFile)) {
    state.currentFile = state.openFiles[0] ?? null;
  }
}

function resetEditorWorkspaceState() {
  useEditorStore.setState({
    activeTab: null,
    unsavedChanges: new Set<string>(),
    cursorPosition: { line: 1, col: 1 },
  });
}

function shouldRefreshPath(changedPaths: readonly string[], path: string) {
  if (changedPaths.length === 0) {
    return true;
  }

  return changedPaths.some(
    (changedPath) =>
      changedPath === path ||
      changedPath.startsWith(`${path}/`) ||
      path.startsWith(`${changedPath}/`),
  );
}

export function resetNoteStore() {
  useNoteStore.setState(createInitialState());
}

export const useNoteStore = create<NoteStore>()(
  immer((set, get) => ({
    ...createInitialState(),
    openWorkspace: async (path) => {
      const files = await fileService.openWorkspace(path);
      resetEditorWorkspaceState();

      set((state) => {
        applyWorkspaceTree(state, path, files);
        state.documents = {};
        state.currentFile = null;
        state.openFiles = [];
        state.recentFiles = [];
      });
    },
    openFile: async (path) => {
      const { documents, workspacePath } = get();
      if (workspacePath) {
        const isDirty = useEditorStore.getState().unsavedChanges.has(path);
        if (!isDirty || !documents[path]) {
          const content = await fileService.readFile(path);
          set((state) => {
            state.documents[path] = createDocumentFromDisk(path, content);
          });
          useEditorStore.getState().markClean(path);
        }

        set((state) => {
          if (!state.documents[path]) {
            return;
          }
          state.currentFile = path;
          state.openFiles = ensureUniquePaths([...state.openFiles, path]);
          state.recentFiles = withRecentFile(state.recentFiles, path);
        });
        return;
      }

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
      const { workspacePath } = get();
      if (workspacePath) {
        await fileService.createFile(path);
        const files = await fileService.readFileTree(workspacePath);

        set((state) => {
          applyWorkspaceTree(state, workspacePath, files);
          state.documents[path] = createDocumentFromDisk(path, "");
          state.currentFile = path;
          state.openFiles = ensureUniquePaths([...state.openFiles, path]);
          state.recentFiles = withRecentFile(state.recentFiles, path);
        });
        useEditorStore.getState().markClean(path);
        return;
      }

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
      const { workspacePath } = get();
      if (workspacePath) {
        await fileService.createDir(path);
        const files = await fileService.readFileTree(workspacePath);
        set((state) => {
          applyWorkspaceTree(state, workspacePath, files);
        });
        return;
      }

      set((state) => {
        if (state.folders.includes(path)) {
          return;
        }
        state.folders = ensureUniquePaths([...state.folders, ...getParentDirectories(path), path]);
        syncFileTree(state);
      });
    },
    deleteFile: async (path) => {
      const { workspacePath } = get();
      if (workspacePath) {
        await fileService.deleteFile(path);
        const files = await fileService.readFileTree(workspacePath);

        set((state) => {
          applyWorkspaceTree(state, workspacePath, files);
          state.openFiles = state.openFiles.filter(
            (entry) => entry !== path && !entry.startsWith(`${path}/`),
          );
          state.recentFiles = state.recentFiles.filter(
            (entry) => entry !== path && !entry.startsWith(`${path}/`),
          );
          state.documents = Object.fromEntries(
            Object.entries(state.documents).filter(
              ([entry]) => entry !== path && !entry.startsWith(`${path}/`),
            ),
          );

          if (state.currentFile === path || state.currentFile?.startsWith(`${path}/`)) {
            state.currentFile = state.openFiles[0] ?? null;
          }
        });
        return;
      }

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
      const { workspacePath } = get();
      if (workspacePath) {
        await fileService.renameFile(oldPath, newPath);
        const files = await fileService.readFileTree(workspacePath);

        set((state) => {
          state.documents = Object.fromEntries(
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
          state.openFiles = state.openFiles.map((path) =>
            renamePrefix(path, oldPath, newPath),
          );
          state.recentFiles = state.recentFiles.map((path) =>
            renamePrefix(path, oldPath, newPath),
          );
          state.currentFile = state.currentFile
            ? renamePrefix(state.currentFile, oldPath, newPath)
            : null;
          applyWorkspaceTree(state, workspacePath, files);
        });
        return;
      }

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
      const { workspacePath } = get();
      if (workspacePath) {
        const files = await fileService.readFileTree(workspacePath);
        set((state) => {
          applyWorkspaceTree(state, workspacePath, files);
        });
        return;
      }

      set((state) => {
        syncFileTree(state);
      });
    },
    refreshWorkspace: async (changedPaths = []) => {
      const { workspacePath, openFiles } = get();
      if (!workspacePath) {
        await get().refreshFileTree();
        return;
      }

      const files = await fileService.readFileTree(workspacePath);
      const dirtyPaths = useEditorStore.getState().unsavedChanges;
      const reloadTargets = openFiles.filter(
        (path) => !dirtyPaths.has(path) && shouldRefreshPath(changedPaths, path),
      );
      const reloadedDocuments = await Promise.all(
        reloadTargets.map(async (path) => {
          try {
            const content = await fileService.readFile(path);
            return [path, content] as const;
          } catch {
            return [path, null] as const;
          }
        }),
      );

      set((state) => {
        applyWorkspaceTree(state, workspacePath, files);
        for (const [path, content] of reloadedDocuments) {
          if (content === null) {
            delete state.documents[path];
            state.openFiles = state.openFiles.filter((entry) => entry !== path);
            state.recentFiles = state.recentFiles.filter((entry) => entry !== path);
            if (state.currentFile === path) {
              state.currentFile = state.openFiles[0] ?? null;
            }
            continue;
          }

          state.documents[path] = createDocumentFromDisk(path, content);
        }
      });

      for (const [path, content] of reloadedDocuments) {
        if (content !== null) {
          useEditorStore.getState().markClean(path);
        }
      }
    },
    saveCurrentFile: async () => {
      const { currentFile, documents, workspacePath } = get();
      if (!workspacePath || !currentFile || !documents[currentFile]) {
        return;
      }

      const document = documents[currentFile];
      await fileService.writeFile(currentFile, document.content);

      set((state) => {
        if (!state.documents[currentFile]) {
          return;
        }
        state.documents[currentFile].savedContent = state.documents[currentFile].content;
      });

      useEditorStore.getState().markClean(currentFile);
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
