import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { fileService } from "../services/fileService";
import type {
  FileNode,
  NoteDocument,
  NoteStore,
  RecentWorkspace,
} from "../types/notes";
import {
  createUniqueMarkdownPath,
  DEFAULT_NEW_DOCUMENT_BASENAME,
  normalizeMarkdownBaseName,
} from "../components/app-shell-utils";
import {
  beginDocumentPerfTrace,
  consumeDocumentPerfSourceHint,
  createDocumentPerfRequestId,
  finishDocumentPerfTrace,
  logDocumentPerfStep,
  peekDocumentPerfTrace,
} from "../utils/documentPerf";
import { useEditorStore } from "./editorStore";

type StoreState = Pick<
  NoteStore,
  | "recentWorkspaces"
  | "workspacePath"
  | "isWorkspaceLoading"
  | "files"
  | "documents"
  | "folders"
  | "currentFile"
  | "openFiles"
  | "recentFiles"
  | "openingFiles"
  | "loadingDirectories"
  | "workspaceSnapshots"
>;

type TreeNode = FileNode & { children?: TreeNode[] };

const pendingDocumentReads = new Map<string, Promise<string>>();

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

      const leftIsPlaceholderDraft =
        !left.isDir && /^Undefined(?: \d+)?\.md$/i.test(left.name);
      const rightIsPlaceholderDraft =
        !right.isDir && /^Undefined(?: \d+)?\.md$/i.test(right.name);

      if (leftIsPlaceholderDraft !== rightIsPlaceholderDraft) {
        return leftIsPlaceholderDraft ? 1 : -1;
      }

      return left.name.localeCompare(right.name, "en");
    })
    .map((node) => ({
      ...node,
      children: node.children ? sortTree(node.children) : undefined,
    }));
}

function annotateLoadedNodes(nodes: readonly FileNode[]): FileNode[] {
  return nodes.map((node) => {
    const children = node.children ? annotateLoadedNodes(node.children) : node.children;
    return {
      ...node,
      hasChildren: node.isDir ? (children?.length ?? 0) > 0 : false,
      isLoaded: true,
      children,
    };
  });
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
          hasChildren: true,
          isLoaded: true,
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
        hasChildren: false,
        isLoaded: true,
        gitStatus: document.gitStatus,
      });
    }
  }

  return annotateLoadedNodes(sortTree(root));
}

function createInitialState(): StoreState {
  return {
    workspacePath: null,
    isWorkspaceLoading: false,
    recentWorkspaces: [],
    files: [],
    documents: {},
    folders: [],
    currentFile: null,
    openFiles: [],
    recentFiles: [],
    openingFiles: [],
    loadingDirectories: [],
    workspaceSnapshots: {},
  };
}

function ensureUniquePaths(paths: readonly string[]) {
  return Array.from(new Set(paths));
}

function withRecentFile(recentFiles: readonly string[], path: string) {
  return [path, ...recentFiles.filter((entry) => entry !== path)].slice(0, 8);
}

function withRecentWorkspace(
  recentWorkspaces: readonly RecentWorkspace[],
  path: string,
  lastOpened = Math.floor(Date.now() / 1000),
) {
  return [
    { path, lastOpened },
    ...recentWorkspaces.filter((entry) => entry.path !== path),
  ].slice(0, 8);
}

function cloneFileNodes(nodes: readonly FileNode[]): FileNode[] {
  return nodes.map((node) => ({
    ...node,
    children: node.children ? cloneFileNodes(node.children) : node.children,
  }));
}

function cloneDocuments(
  documents: Record<string, NoteDocument>,
): Record<string, NoteDocument> {
  return Object.fromEntries(
    Object.entries(documents).map(([path, document]) => [path, { ...document }]),
  );
}

function captureStoreSnapshot(state: StoreState): StoreState {
  return {
    workspacePath: state.workspacePath,
    isWorkspaceLoading: state.isWorkspaceLoading,
    recentWorkspaces: state.recentWorkspaces.map((entry) => ({ ...entry })),
    files: cloneFileNodes(state.files),
    documents: cloneDocuments(state.documents),
    folders: [...state.folders],
    currentFile: state.currentFile,
    openFiles: [...state.openFiles],
    recentFiles: [...state.recentFiles],
    openingFiles: [...state.openingFiles],
    loadingDirectories: [...state.loadingDirectories],
    workspaceSnapshots: Object.fromEntries(
      Object.entries(state.workspaceSnapshots).map(([path, nodes]) => [
        path,
        cloneFileNodes(nodes),
      ]),
    ),
  };
}

function rememberWorkspaceSnapshot(state: StoreState) {
  if (!state.workspacePath) {
    return;
  }

  state.workspaceSnapshots[state.workspacePath] = cloneFileNodes(state.files);
}

function setWorkspaceShell(
  state: StoreState,
  workspacePath: string | null,
  files: FileNode[],
) {
  const workspaceState = collectWorkspaceState(files);
  state.workspacePath = workspacePath;
  state.files = cloneFileNodes(files);
  state.folders = workspaceState.folders;
  state.documents = {};
  state.currentFile = null;
  state.openFiles = [];
  state.recentFiles = [];
  state.openingFiles = [];
  state.loadingDirectories = [];
}

export function mergeWorkspaceSnapshot(
  shallowFiles: readonly FileNode[],
  cachedFiles: readonly FileNode[],
): FileNode[] {
  const cachedByPath = new Map(cachedFiles.map((node) => [node.path, node]));

  return shallowFiles.map((node) => {
    const cached = cachedByPath.get(node.path);
    if (!node.isDir || !cached?.isDir || !cached.isLoaded) {
      return {
        ...node,
        children: node.children ? cloneFileNodes(node.children) : node.children,
      };
    }

    const cachedChildren = cloneFileNodes(cached.children ?? []);
    return {
      ...node,
      hasChildren: node.hasChildren || cached.hasChildren || cachedChildren.length > 0,
      isLoaded: true,
      children: cachedChildren,
    };
  });
}

export function mergeLoadedDirectory(
  nodes: readonly FileNode[],
  targetPath: string,
  children: readonly FileNode[],
): FileNode[] {
  return nodes.map((node) => {
    if (node.path === targetPath && node.isDir) {
      const nextChildren = cloneFileNodes(children);
      return {
        ...node,
        hasChildren: nextChildren.length > 0,
        isLoaded: true,
        children: nextChildren,
      };
    }

    if (!node.children) {
      return { ...node };
    }

    return {
      ...node,
      children: mergeLoadedDirectory(node.children, targetPath, children),
    };
  });
}

function hasNodePath(nodes: readonly FileNode[], targetPath: string): boolean {
  return nodes.some((node) => {
    if (node.path === targetPath) {
      return true;
    }

    return node.children ? hasNodePath(node.children, targetPath) : false;
  });
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

function movePathToIndex(paths: readonly string[], fromPath: string, toIndex: number) {
  const fromIndex = paths.indexOf(fromPath);
  if (fromIndex === -1) {
    return [...paths];
  }

  const nextPaths = [...paths];
  const [movedPath] = nextPaths.splice(fromIndex, 1);
  const normalizedIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
  const safeIndex = clamp(normalizedIndex, 0, nextPaths.length);
  nextPaths.splice(safeIndex, 0, movedPath);
  return nextPaths;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function createMarkdownTemplate(path: string) {
  const title = getFileName(path).replace(/\.md$/i, "");
  return `# ${title}\n\n`;
}

function syncEditorRenamedPath(oldPath: string, newPath: string) {
  useEditorStore.getState().renameTrackedPath(oldPath, newPath);
}

function getPendingDocumentReadKey(workspacePath: string, path: string) {
  return `${workspacePath}\u0000${path}`;
}

function hasPendingDocumentRead(workspacePath: string, path: string) {
  return pendingDocumentReads.has(getPendingDocumentReadKey(workspacePath, path));
}

function readDocumentOnce(
  workspacePath: string,
  path: string,
  requestId?: string,
) {
  const key = getPendingDocumentReadKey(workspacePath, path);
  const pendingRead = pendingDocumentReads.get(key);
  if (pendingRead) {
    return pendingRead;
  }

  const nextRead = fileService.readFile(path, { requestId }).finally(() => {
    pendingDocumentReads.delete(key);
  });
  pendingDocumentReads.set(key, nextRead);
  return nextRead;
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
  state.openingFiles = state.openingFiles.filter((path) => existingFiles.has(path));

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
    hydrateRecentWorkspaces: async () => {
      if (!fileService.isNativeAvailable()) {
        return;
      }

      const recentWorkspaces = await fileService.listRecentWorkspaces();
      set((state) => {
        state.recentWorkspaces = recentWorkspaces;
      });
    },
    openWorkspace: async (path) => {
      const previousState = captureStoreSnapshot(get());
      const cachedSnapshot = get().workspaceSnapshots[path];
      resetEditorWorkspaceState();

      set((state) => {
        state.recentWorkspaces = withRecentWorkspace(state.recentWorkspaces, path);
        rememberWorkspaceSnapshot(state);
        setWorkspaceShell(
          state,
          path,
          cachedSnapshot ? cloneFileNodes(cachedSnapshot) : [],
        );
        state.isWorkspaceLoading = !cachedSnapshot;
      });

      try {
        const files = await fileService.openWorkspace(path);
        set((state) => {
          const mergedFiles = state.workspaceSnapshots[path]
            ? mergeWorkspaceSnapshot(files, state.workspaceSnapshots[path])
            : cloneFileNodes(files);
          setWorkspaceShell(state, path, mergedFiles);
          state.recentWorkspaces = withRecentWorkspace(state.recentWorkspaces, path);
          state.workspaceSnapshots[path] = cloneFileNodes(mergedFiles);
          state.isWorkspaceLoading = false;
        });
      } catch (error) {
        set((state) => {
          Object.assign(state, previousState);
        });
        throw error;
      }
    },
    removeRecentWorkspace: async (path) => {
      if (fileService.isNativeAvailable()) {
        await fileService.removeRecentWorkspace(path);
      }

      const shouldCloseWorkspace = get().workspacePath === path;
      if (shouldCloseWorkspace && fileService.isNativeAvailable()) {
        await fileService.closeWorkspace();
      }

      if (shouldCloseWorkspace) {
        resetEditorWorkspaceState();
      }

      set((state) => {
        state.recentWorkspaces = state.recentWorkspaces.filter(
          (entry) => entry.path !== path,
        );
        delete state.workspaceSnapshots[path];
        if (shouldCloseWorkspace) {
          setWorkspaceShell(state, null, []);
          state.isWorkspaceLoading = false;
        }
      });
    },
    loadDirectory: async (path) => {
      const { workspacePath, loadingDirectories, files } = get();
      if (!workspacePath || loadingDirectories.includes(path)) {
        return;
      }

      const hasTarget = hasNodePath(files, path);
      if (!hasTarget) {
        return;
      }

      set((state) => {
        state.loadingDirectories = ensureUniquePaths([
          ...state.loadingDirectories,
          path,
        ]);
      });

      try {
        const children = await fileService.readFileTree(path);
        set((state) => {
          state.files = mergeLoadedDirectory(state.files, path, children);
          state.folders = collectWorkspaceState(state.files).folders;
          state.loadingDirectories = state.loadingDirectories.filter(
            (entry) => entry !== path,
          );
          if (workspacePath) {
            state.workspaceSnapshots[workspacePath] = cloneFileNodes(state.files);
          }
        });
      } catch (error) {
        set((state) => {
          state.loadingDirectories = state.loadingDirectories.filter(
            (entry) => entry !== path,
          );
        });
        throw error;
      }
    },
    openFile: async (path) => {
      const { documents, workspacePath } = get();
      const requestId = createDocumentPerfRequestId();
      const source = consumeDocumentPerfSourceHint(path) ?? "unknown";
      const trace =
        peekDocumentPerfTrace(path) ?? beginDocumentPerfTrace(path, source);
      logDocumentPerfStep("noteStore.openFile.start", {
        path,
        trace,
        requestId,
        workspacePath,
        source,
        hasCachedDocument: Boolean(documents[path]),
      });

      if (workspacePath) {
        if (documents[path]) {
          set((state) => {
            state.currentFile = path;
            state.openFiles = ensureUniquePaths([...state.openFiles, path]);
            state.recentFiles = withRecentFile(state.recentFiles, path);
            state.openingFiles = state.openingFiles.filter((entry) => entry !== path);
          });
          logDocumentPerfStep("noteStore.openFile.cacheHit", {
            path,
            trace,
            requestId,
            openFiles: get().openFiles.length,
          });
          return;
        }

        const reusingPendingRead = hasPendingDocumentRead(workspacePath, path);
        set((state) => {
          state.currentFile = path;
          state.openFiles = ensureUniquePaths([...state.openFiles, path]);
          state.recentFiles = withRecentFile(state.recentFiles, path);
          state.openingFiles = ensureUniquePaths([...state.openingFiles, path]);
        });
        logDocumentPerfStep("noteStore.openFile.queued", {
          path,
          trace,
          requestId,
          pendingReuse: reusingPendingRead,
          openingFiles: get().openingFiles.length,
        });

        try {
          const content = await readDocumentOnce(workspacePath, path, requestId);
          set((state) => {
            state.openingFiles = state.openingFiles.filter((entry) => entry !== path);
            if (state.workspacePath !== workspacePath) {
              return;
            }

            state.documents[path] = createDocumentFromDisk(path, content);
          });
          logDocumentPerfStep("noteStore.openFile.contentReady", {
            path,
            trace,
            requestId,
            contentLength: content.length,
            openingFiles: get().openingFiles.length,
          });
          useEditorStore.getState().markClean(path);
        } catch (error) {
          set((state) => {
            state.openingFiles = state.openingFiles.filter((entry) => entry !== path);
            if (state.workspacePath !== workspacePath) {
              return;
            }

            delete state.documents[path];
            state.openFiles = state.openFiles.filter((entry) => entry !== path);
            state.recentFiles = state.recentFiles.filter((entry) => entry !== path);
            if (state.currentFile === path) {
              state.currentFile =
                state.openFiles[state.openFiles.length - 1] ?? null;
            }
          });
          finishDocumentPerfTrace(path, "noteStore.openFile.error", {
            requestId,
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
        return;
      }

      set((state) => {
        if (!state.documents[path]) {
          return;
        }
        state.currentFile = path;
        state.openFiles = ensureUniquePaths([...state.openFiles, path]);
        state.recentFiles = withRecentFile(state.recentFiles, path);
        state.openingFiles = state.openingFiles.filter((entry) => entry !== path);
      });
      logDocumentPerfStep("noteStore.openFile.localCacheHit", {
        path,
        trace,
        requestId,
        openFiles: get().openFiles.length,
      });
    },
    prefetchFile: async (path) => {
      const { documents, workspacePath } = get();
      if (!workspacePath || documents[path]) {
        return;
      }

      try {
        const content = await readDocumentOnce(workspacePath, path);
        set((state) => {
          if (state.workspacePath !== workspacePath || state.documents[path]) {
            return;
          }
          state.documents[path] = createDocumentFromDisk(path, content);
        });
      } catch {
        // 预取失败不影响主交互链路
      }
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
    closeAllFiles: async () => {
      set((state) => {
        state.openFiles = [];
        state.currentFile = null;
      });
    },
    closeOtherFiles: async (path) => {
      set((state) => {
        if (!state.openFiles.includes(path)) {
          return;
        }

        state.openFiles = [path];
        state.currentFile = path;
      });
    },
    closeFilesToLeft: async (path) => {
      set((state) => {
        const index = state.openFiles.indexOf(path);
        if (index <= 0) {
          return;
        }

        state.openFiles = state.openFiles.slice(index);
        state.currentFile = path;
      });
    },
    closeFilesToRight: async (path) => {
      set((state) => {
        const index = state.openFiles.indexOf(path);
        if (index === -1 || index === state.openFiles.length - 1) {
          return;
        }

        state.openFiles = state.openFiles.slice(0, index + 1);
        state.currentFile = path;
      });
    },
    reorderOpenFiles: (fromPath, toIndex) => {
      set((state) => {
        state.openFiles = movePathToIndex(state.openFiles, fromPath, toIndex);
      });
    },
    createFile: async (path) => {
      const initialContent = createMarkdownTemplate(path);
      const { workspacePath } = get();
      if (workspacePath) {
        await fileService.writeFile(path, initialContent);
        const files = await fileService.readFileTree(workspacePath);

        set((state) => {
          applyWorkspaceTree(state, workspacePath, files);
          state.documents[path] = createDocumentFromDisk(path, initialContent);
          state.currentFile = path;
          state.openFiles = ensureUniquePaths([...state.openFiles, path]);
          state.recentFiles = withRecentFile(state.recentFiles, path);
          state.openingFiles = state.openingFiles.filter((entry) => entry !== path);
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
    createFileInDirectory: async (
      directoryPath,
      baseName = DEFAULT_NEW_DOCUMENT_BASENAME,
    ) => {
      const state = get();
      let existingPaths = collectWorkspaceState(state.files).files;

      if (state.workspacePath) {
        try {
          const siblingNodes = await fileService.readFileTree(
            directoryPath || state.workspacePath,
          );
          existingPaths = [
            ...new Set([
              ...existingPaths,
              ...collectWorkspaceState(siblingNodes).files,
            ]),
          ];
        } catch {
          // 退回到当前缓存树，避免创建流程被目录读取失败阻断
        }
      }

      const nextPath = createUniqueMarkdownPath(
        directoryPath,
        normalizeMarkdownBaseName(baseName),
        existingPaths,
      );
      await get().createFile(nextPath);
      return nextPath;
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
          state.openingFiles = state.openingFiles.filter(
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
        state.openingFiles = state.openingFiles.filter(
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
        syncEditorRenamedPath(oldPath, newPath);
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
      syncEditorRenamedPath(oldPath, newPath);
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
            state.openingFiles = state.openingFiles.filter(
              (entry) => entry !== path,
            );
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
