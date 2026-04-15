export type FileGitStatus =
  | "added"
  | "modified"
  | "deleted"
  | "untracked"
  | "renamed"
  | "typechange"
  | "conflicted"
  | "ignored"
  | "clean";

export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  hasChildren: boolean;
  isLoaded: boolean;
  children?: FileNode[];
  gitStatus?: FileGitStatus;
}

export interface NoteDocument {
  path: string;
  name: string;
  content: string;
  savedContent: string;
  language: string;
  gitStatus: FileGitStatus;
  isMarkdown: boolean;
}

export interface RecentWorkspace {
  path: string;
  lastOpened: number;
}

export interface NoteStoreState {
  workspacePath: string | null;
  isWorkspaceLoading: boolean;
  recentWorkspaces: RecentWorkspace[];
  files: FileNode[];
  documents: Record<string, NoteDocument>;
  folders: string[];
  currentFile: string | null;
  openFiles: string[];
  recentFiles: string[];
  loadingDirectories: string[];
  workspaceSnapshots: Record<string, FileNode[]>;
}

export interface NoteStoreActions {
  hydrateRecentWorkspaces: () => Promise<void>;
  openWorkspace: (path: string) => Promise<void>;
  removeRecentWorkspace: (path: string) => Promise<void>;
  loadDirectory: (path: string) => Promise<void>;
  openFile: (path: string) => Promise<void>;
  closeFile: (path: string) => Promise<void>;
  closeAllFiles: () => Promise<void>;
  closeOtherFiles: (path: string) => Promise<void>;
  closeFilesToLeft: (path: string) => Promise<void>;
  closeFilesToRight: (path: string) => Promise<void>;
  reorderOpenFiles: (fromPath: string, toIndex: number) => void;
  createFile: (path: string) => Promise<void>;
  createFolder: (path: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  renameFile: (oldPath: string, newPath: string) => Promise<void>;
  refreshFileTree: () => Promise<void>;
  refreshWorkspace: (changedPaths?: string[]) => Promise<void>;
  saveCurrentFile: () => Promise<void>;
  updateFileContent: (path: string, content: string) => void;
}

export type NoteStore = NoteStoreState & NoteStoreActions;
